"""LLM-based bank statement extraction agent.

Replaces the static, position-based bank statement parsers with an AI agent
that turns raw OCR text into structured transactions, runs a mathematical
ledger balance verification, and flags potential window-dressing behaviour
(abnormal round-sum injections, round-tripping, sensitive descriptions).

The agent degrades gracefully: when HF_TOKEN is not configured, the LLM call
fails, or the response cannot be parsed, callers fall back to the static
parsers, so the pipeline never hard-depends on the external service.
"""

import json
import logging
import os
from datetime import datetime
from typing import List, Optional

from src.parsers.base_parser import SuspiciousCredit, Transaction

try:
    # Load HF_TOKEN from the gitignored .env when running outside uvicorn
    # (e.g. the CLI in src/main.py or ad-hoc scripts).
    from dotenv import load_dotenv

    load_dotenv()
except ImportError:
    pass

logger = logging.getLogger("ocr_analyzer")

MODEL_ID = "Qwen/Qwen2.5-7B-Instruct"
CONFIRM_REQUIRED = "[CONFIRM_REQUIRED]"

EXTRACTION_SYSTEM_PROMPT = """# Role
You are a highly precise Financial Data Audit and Credit Risk Control Agent specializing in commercial bank statements from major Singaporean banks (including UOB, DBS, OCBC, Maybank, Citibank, and HSBC). Your core mission is to transform irregular, non-structured OCR text from bank statements into pristine, structured data required for calculating critical credit metrics such as DSCR (Debt Service Coverage Ratio) and FCC (Fixed Cost Coverage Ratio).

# Objective
Accurately extract every single Credit (inflow) and Debit (outflow) transaction from the statement, identify potential financial window-dressing or fraud behaviors (e.g., deliberate capital injection to inflate cash flow), and execute a strict mathematical ledger balance verification.

# Constraints & Rules

1. Zero Tolerance for Hallucination (Strict Uncertainty Handling)
   - If any character, number, or sign is ambiguous, misaligned, or obscured due to OCR limitations (e.g., amounts appearing as `1,00.00` or `8?0.00`), you are STRICTLY PROHIBITED from guessing.
   - You must populate the amount field with the exact string `"[CONFIRM_REQUIRED]"` and document the specific reason in the `flagged_reasons` array (e.g., "OCR text ambiguous for amount").

2. Standardization of Banking Terminology (Singapore Bank Mapping)
   - Normalize varying terminologies across different banks:
     - **Debit (Outflows)**: Includes but is not limited to: Debit, Total Out, Paid Out, Withdrawals, Funds Out, 支出.
     - **Credit (Inflows)**: Includes but is not limited to: Credit, Total In, Received, Deposits, Funds In, 存入.
   - All monetary amounts in the final output must be formatted as positive float values. The direction of the money flow must be distinguished solely by the `type` field (`"DEBIT"` or `"CREDIT"`).

3. Mathematical Ledger Balance Verification
   - You must calculate and verify the transaction formula: Starting Balance + Sum(Credits) - Sum(Debits) = Ending Balance.
   - If any transaction amount contains `"[CONFIRM_REQUIRED]"`, skip the total sum calculation entirely, set `is_balanced` to `null`, and state `"Cannot calculate balance due to unconfirmed amounts"` in the `error_log`.
   - If all numbers are clear but the calculated total does not equal the stated Ending Balance, set `is_balanced` to `false` and calculate the exact variance in the `error_log`.

4. Anti-Window Dressing / Fraud Detection
   For any **Credit (Inflow)** transaction, you must mark `is_suspicious` as `true` and provide the corresponding reason in `flagged_reasons` if it meets any of the following risk indicators:
   - **Indicator A (Abnormal Large Round Sums)**: A sudden, large, round-number deposit (e.g., $50,000, $100,000) that deviates heavily from the account's historical baseline transaction size, indicating a potential temporary injection to artificially inflate cash flow.
   - **Indicator B (Round-Tripping / Fast In-and-Out)**: A large deposit that is withdrawn or transferred out in similar amounts within 1 to 3 business days.
   - **Indicator C (Sensitive Transaction Descriptions)**: Transaction descriptions containing keywords like "Director Loan", "Shareholder Injection", "Related Party", "Transfer from Director", or personal transfers lacking clear commercial trade backgrounds.

# Input Specification
The user will provide raw, unstructured text or tabular data snippets extracted via OCR from a UOB, DBS, OCBC, Maybank, Citibank, or HSBC bank statement.

# Output Format
Return ONLY a raw, valid JSON object. Do not wrap the response in markdown code blocks (such as ```json) and do not include any conversational preambles, introductions, or postscripts.

{
  "bank_info": {
    "bank_name": "UOB/DBS/OCBC/Maybank/Citi/HSBC/UNKNOWN",
    "account_number": "String or null",
    "statement_period": "YYYY-MM-DD to YYYY-MM-DD"
  },
  "summary": {
    "starting_balance": Number or "[CONFIRM_REQUIRED]",
    "ending_balance": Number or "[CONFIRM_REQUIRED]",
    "calculated_total_credit": Number or null,
    "calculated_total_debit": Number or null,
    "is_balanced": Boolean or null,
    "error_log": "String or null"
  },
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "description": "Original raw transaction description string",
      "amount": Number or "[CONFIRM_REQUIRED]",
      "type": "CREDIT/DEBIT",
      "is_suspicious": Boolean,
      "flagged_reasons": ["Reason string 1", "Reason string 2"]
    }
  ]
}"""

# Date formats the agent may emit despite the ISO instruction.
_DATE_FORMATS = ["%Y-%m-%d", "%d %b %Y", "%d %B %Y", "%d/%m/%Y", "%d-%m-%Y"]

# Balance rows the model sometimes emits as transactions; they are ledger
# markers, not money movements, and would corrupt credit/debit totals.
_BALANCE_ROW_MARKERS = (
    "opening balance",
    "closing balance",
    "balance b/f",
    "balance c/f",
    "balance brought forward",
    "balance carried forward",
    "beginning balance",
    "ending balance",
)


class BankStatementExtractionAgent:
    """Runs the extraction system prompt against a HuggingFace chat model.

    Usage:
        agent = BankStatementExtractionAgent()
        payload = agent.run(ocr_text)          # raw JSON dict or None
        if payload is not None:
            extraction = agent.to_pipeline(payload)   # pipeline-shaped dict
    """

    def __init__(self, api_key: Optional[str] = None, model: str = MODEL_ID):
        self.api_key = api_key or os.environ.get("HF_TOKEN")
        self.model = model

    @property
    def available(self) -> bool:
        return bool(self.api_key)

    # ------------------------------------------------------------------ #
    # LLM call
    # ------------------------------------------------------------------ #
    def run(self, ocr_text: str) -> Optional[dict]:
        """Call the LLM on raw OCR text; return the parsed payload or None."""
        if not self.available or not (ocr_text or "").strip():
            return None
        try:
            from huggingface_hub import InferenceClient

            client = InferenceClient(token=self.api_key, timeout=120)
            response = client.chat_completion(
                model=self.model,
                messages=[
                    {"role": "system", "content": EXTRACTION_SYSTEM_PROMPT},
                    {"role": "user", "content": ocr_text},
                ],
                max_tokens=4096,
                temperature=0.1,
            )
            text = (response.choices[0].message.content or "").strip()
            payload = self._parse_json(text)
            if not isinstance(payload, dict) or "transactions" not in payload:
                logger.warning("Extraction agent returned unusable payload")
                return None
            return payload
        except Exception:
            logger.exception("LLM extraction agent call failed")
            return None

    @staticmethod
    def _parse_json(text: str) -> Optional[dict]:
        """Parse the model output into JSON, tolerating stray fences/prose."""
        candidate = text
        if candidate.startswith("```"):
            candidate = candidate.strip("`")
            if candidate.lower().startswith("json"):
                candidate = candidate[4:]
        start = candidate.find("{")
        end = candidate.rfind("}")
        if start == -1 or end <= start:
            return None
        try:
            return json.loads(candidate[start : end + 1])
        except json.JSONDecodeError:
            return None

    # ------------------------------------------------------------------ #
    # Conversion into the existing pipeline shapes
    # ------------------------------------------------------------------ #
    def to_pipeline(self, payload: dict) -> dict:
        """Convert the agent's JSON into the shapes the pipeline consumes.

        Returns a dict with:
            transactions:       List[Transaction] ("DD MMM YYYY" dates so the
                                downstream detectors' date regexes keep working)
            suspicious_credits: List[SuspiciousCredit] from is_suspicious flags
            warnings:           List[str] (unreadable amounts, ledger mismatch)
            ledger:             summary/ledger-verification dict (JSON-safe)
            bank_name:          normalized bank name string or None
        """
        transactions: List[Transaction] = []
        suspicious: List[SuspiciousCredit] = []
        warnings: List[str] = []
        confirm_required = 0

        for item in payload.get("transactions") or []:
            if not isinstance(item, dict):
                continue
            amount = item.get("amount")
            if not isinstance(amount, (int, float)):
                # "[CONFIRM_REQUIRED]" or other non-numeric: never guess.
                confirm_required += 1
                continue
            tx_type = str(item.get("type") or "").strip().lower()
            if tx_type not in ("credit", "debit"):
                continue

            date = self._format_date(str(item.get("date") or ""))
            description = str(item.get("description") or "").strip()
            if any(m in description.lower() for m in _BALANCE_ROW_MARKERS):
                continue
            transaction = Transaction(
                date=date,
                description=description,
                amount=float(abs(amount)),
                transaction_type=tx_type,
                raw_text=f"{date} {description} {abs(amount):,.2f} {tx_type.upper()}",
            )
            transactions.append(transaction)

            if item.get("is_suspicious") and tx_type == "credit":
                reasons = [
                    str(r) for r in (item.get("flagged_reasons") or []) if r
                ]
                suspicious.append(
                    SuspiciousCredit(
                        transaction=transaction,
                        risk_score=0.75,
                        reason="; ".join(reasons)
                        or "Flagged as suspicious by AI extraction agent",
                    )
                )

        if confirm_required:
            warnings.append(
                f"{confirm_required} transaction amount(s) were unreadable in "
                f"the OCR text ({CONFIRM_REQUIRED}) and were excluded from "
                "totals — manual confirmation required."
            )

        summary = payload.get("summary") or {}
        ledger = {
            "starting_balance": summary.get("starting_balance"),
            "ending_balance": summary.get("ending_balance"),
            "calculated_total_credit": summary.get("calculated_total_credit"),
            "calculated_total_debit": summary.get("calculated_total_debit"),
            "is_balanced": summary.get("is_balanced"),
            "error_log": summary.get("error_log"),
        }
        if ledger["is_balanced"] is False:
            warnings.append(
                "Ledger balance verification FAILED: "
                + (ledger["error_log"] or "statement totals do not reconcile.")
            )
        elif ledger["is_balanced"] is None and ledger["error_log"]:
            warnings.append(
                f"Ledger balance verification inconclusive: {ledger['error_log']}"
            )

        bank_info = payload.get("bank_info") or {}
        bank_name = bank_info.get("bank_name")
        if isinstance(bank_name, str):
            bank_name = bank_name.strip() or None
            if bank_name and bank_name.upper() == "UNKNOWN":
                bank_name = None
        else:
            bank_name = None

        return {
            "transactions": transactions,
            "suspicious_credits": suspicious,
            "warnings": warnings,
            "ledger": ledger,
            "bank_name": bank_name,
        }

    @staticmethod
    def _format_date(date_str: str) -> str:
        """Normalize to "DD MMM YYYY" (uppercase) used across the pipeline."""
        cleaned = date_str.strip()
        for fmt in _DATE_FORMATS:
            try:
                return datetime.strptime(cleaned, fmt).strftime("%d %b %Y").upper()
            except ValueError:
                continue
        return cleaned

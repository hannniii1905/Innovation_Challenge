"""Report generation and JSON output.

Combines the outputs of the bank statement parsers, the loan detector, and the
fraud detector into a structured report dict that matches the report schemas
defined in the design document. Also produces IRAS NOA reports and a JSON
serialization helper.

All monetary amounts in the generated reports are formatted (rounded) to two
decimal places.

Validates: Requirements 7.1, 7.2, 7.3, 7.4
"""

import json
from typing import Dict, List, Optional

from src.credit_kiting import CreditKitingFinding
from src.parsers.base_parser import LoanRepayment, SuspiciousCredit, Transaction


class ReportGenerator:
    """Builds structured analysis reports for bank statements and IRAS NOAs.

    The generated reports are plain ``dict`` objects composed only of
    JSON-serializable values (str, int, float, list, dict, None), so they can
    be passed directly to :meth:`to_json` or any other JSON encoder.
    """

    @staticmethod
    def _money(amount: Optional[float]) -> float:
        """Round a monetary amount to two decimal places.

        Returns ``0.0`` when the input is ``None`` so totals always render as a
        numeric value. ``round`` is used so the value stays a JSON number while
        ``json.dumps`` renders it with its natural representation (e.g. 150000.0
        for an integral amount).
        """
        if amount is None:
            return 0.0
        return round(float(amount), 2)

    def generate_bank_report(
        self,
        bank: Optional[str],
        company_name: Optional[str],
        statement_period: Optional[str],
        transactions: Optional[List[Transaction]],
        loan_result: Optional[Dict],
        suspicious_credits: Optional[List[SuspiciousCredit]],
        warnings: Optional[List[str]] = None,
        credit_kiting: Optional[List[CreditKitingFinding]] = None,
    ) -> Dict:
        """Assemble a bank statement report dict.

        Args:
            bank: Issuing bank name (e.g. "DBS").
            company_name: Account holder's company name.
            statement_period: Statement period string.
            transactions: All parsed transactions (used to compute totals).
            loan_result: The dict returned by ``LoanDetector.detect`` with keys
                ``count``, ``total_amount`` and ``repayments``.
            suspicious_credits: List of ``SuspiciousCredit`` objects from
                ``FraudDetector.analyze``.
            warnings: Optional list of extraction-issue warning strings.
            credit_kiting: Optional list of ``CreditKitingFinding`` objects from
                ``CreditKitingDetector.detect``. Defaults to ``None``, which
                produces an empty credit-kiting section.

        Returns:
            A report dict matching the bank statement report schema.
        """
        transactions = transactions or []
        warnings = list(warnings) if warnings else []

        total_credits = self._money(
            sum(
                t.amount
                for t in transactions
                if (t.transaction_type or "").lower() == "credit"
            )
        )
        total_debits = self._money(
            sum(
                t.amount
                for t in transactions
                if (t.transaction_type or "").lower() == "debit"
            )
        )

        return {
            "document_type": "bank_statement",
            "bank": bank,
            "company_name": company_name,
            "statement_period": statement_period,
            "total_credits": total_credits,
            "total_debits": total_debits,
            "loan_repayments": self._build_loan_section(loan_result),
            "suspicious_credits": self._build_suspicious_section(suspicious_credits),
            "credit_kiting": self._build_credit_kiting_section(credit_kiting),
            "warnings": warnings,
        }

    def generate_iras_report(
        self,
        individual_name: Optional[str],
        year_of_assessment: Optional[str],
        total_income: Optional[float],
        warnings: Optional[List[str]] = None,
    ) -> Dict:
        """Assemble an IRAS NOA report dict.

        Args:
            individual_name: The taxpayer's name.
            year_of_assessment: The year of assessment string (e.g. "2024").
            total_income: The total income amount in SGD.
            warnings: Optional list of extraction-issue warning strings.

        Returns:
            A report dict matching the IRAS NOA report schema.
        """
        return {
            "document_type": "iras_noa",
            "individual_name": individual_name,
            "year_of_assessment": year_of_assessment,
            "total_income": self._money(total_income),
            "warnings": list(warnings) if warnings else [],
        }

    def to_json(self, report: Dict) -> str:
        """Serialize a report dict to a pretty-printed JSON string.

        Args:
            report: A report dict produced by one of the ``generate_*`` methods.

        Returns:
            A JSON string indented with two spaces.
        """
        return json.dumps(report, indent=2)

    # ------------------------------------------------------------------ #
    # Section builders
    # ------------------------------------------------------------------ #
    def _build_loan_section(self, loan_result: Optional[Dict]) -> Dict:
        """Build the ``loan_repayments`` section from a LoanDetector result.

        Maps the detector's ``repayments`` (list of ``LoanRepayment``) into a
        JSON-serializable ``transactions`` list, and formats the total amount.
        """
        if not loan_result:
            return {"count": 0, "total_amount": 0.0, "transactions": []}

        repayments: List[LoanRepayment] = loan_result.get("repayments") or []
        transactions = [
            {
                "date": rep.transaction.date,
                "description": rep.transaction.description,
                "amount": self._money(rep.transaction.amount),
                "loan_type": rep.loan_type,
            }
            for rep in repayments
        ]

        count = loan_result.get("count", len(repayments))
        total_amount = self._money(loan_result.get("total_amount"))

        return {
            "count": count,
            "total_amount": total_amount,
            "transactions": transactions,
        }

    def _build_suspicious_section(
        self, suspicious_credits: Optional[List[SuspiciousCredit]]
    ) -> Dict:
        """Build the ``suspicious_credits`` section from fraud detector output."""
        suspicious_credits = suspicious_credits or []
        transactions = [
            {
                "date": sc.transaction.date,
                "amount": self._money(sc.transaction.amount),
                "risk_score": sc.risk_score,
                "reason": sc.reason,
            }
            for sc in suspicious_credits
        ]
        return {
            "count": len(transactions),
            "transactions": transactions,
        }

    _RISK_ORDER = {"high": 0, "medium": 1, "low": 2}

    def _build_credit_kiting_section(
        self, credit_kiting: Optional[List[CreditKitingFinding]]
    ) -> Dict:
        """Build the ``credit_kiting`` section from kiting detector output.

        Findings are ordered by risk level (high → medium → low). Each finding
        is rendered with its pattern, risk level, explanation, sales-oriented
        suggested action, and the transactions that triggered it.
        """
        credit_kiting = credit_kiting or []
        ordered = sorted(
            credit_kiting,
            key=lambda f: self._RISK_ORDER.get(f.risk_level, 99),
        )
        findings = [
            {
                "pattern": finding.pattern,
                "risk_level": finding.risk_level,
                "explanation": finding.explanation,
                "suggested_action": finding.suggested_action,
                "related_transactions": [
                    {
                        "date": tx.date,
                        "description": tx.description,
                        "amount": self._money(tx.amount),
                    }
                    for tx in (finding.related_transactions or [])
                ],
            }
            for finding in ordered
        ]
        return {
            "count": len(findings),
            "findings": findings,
        }

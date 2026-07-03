"""UOB (United Overseas Bank) statement parser implementation."""

import re
from typing import List, Optional

from src.parsers.base_parser import BaseBankParser, Transaction


class UOBParser(BaseBankParser):
    """Parser for UOB (United Overseas Bank) financial statements.

    Handles UOB-specific statement formatting including:
    - Company name extraction from the BUSINESS ACCOUNT STATEMENT header
    - Transaction table parsing (TRANS DATE, TRANSACTION DESCRIPTION, REF/CHQ NO.,
      CREDITS (+), DEBITS (-), BALANCE)
    - Statement period extraction from "Statement Period: DD MMM YYYY TO DD MMM YYYY"
    - SGD amount formatting with commas and decimals

    UOB statement rows collapse to a single transaction amount plus a running
    balance, so credit/debit classification is performed by tracking the change
    in the running balance between consecutive rows.
    """

    def extract_company_name(self, text: str) -> Optional[str]:
        """Extract the account holder's company name from the UOB statement header.

        UOB statements place the company name on the line following the
        'BUSINESS ACCOUNT STATEMENT' / 'UNITED OVERSEAS BANK' header lines.
        The company name shares its line with "Account Number" (e.g.,
        "TECH INNOVATION PTE. LTD. Account Number: 128-304928-4").

        Args:
            text: The full extracted text from the UOB bank statement.

        Returns:
            The company name if found, or None if it cannot be identified.
        """
        lines = text.split("\n")

        # Primary: the company name shares a line with "Account Number".
        for line in lines:
            if "Account Number" in line:
                name_part = line.split("Account Number")[0].strip()
                if name_part:
                    return name_part
                break

        # Fallback: look for the line after BUSINESS ACCOUNT STATEMENT header.
        for i, line in enumerate(lines):
            if "BUSINESS ACCOUNT STATEMENT" in line.upper():
                for j in range(i + 1, min(i + 6, len(lines))):
                    candidate = lines[j].strip()
                    if not candidate:
                        continue
                    if "UNITED OVERSEAS BANK" in candidate.upper():
                        # Strip the bank/header portion if present on this line.
                        if "Account Number" in candidate:
                            name_part = candidate.split("Account Number")[0].strip()
                            if name_part:
                                return name_part
                        continue
                    if "Account Type" in candidate or "Currency" in candidate:
                        continue
                    if "Account Number" in candidate:
                        name_part = candidate.split("Account Number")[0].strip()
                        if name_part:
                            return name_part
                        continue
                    return candidate
                break

        return None

    def extract_transactions(self, text: str) -> List[Transaction]:
        """Extract all transactions from the UOB statement text.

        UOB transaction tables have columns:
        - TRANS DATE (DD MMM YYYY)
        - TRANSACTION DESCRIPTION
        - REF/CHQ NO.
        - CREDITS (+)
        - DEBITS (-)
        - BALANCE

        Each data row collapses to a single transaction amount followed by the
        running balance. The transaction type is determined by comparing the
        running balance against the previous row's balance.

        Args:
            text: The full extracted text from the UOB bank statement.

        Returns:
            A list of Transaction objects parsed from the statement.
        """
        transactions: List[Transaction] = []
        lines = text.split("\n")

        # Find the start of the transaction section.
        transaction_start = -1
        for i, line in enumerate(lines):
            if "TRANSACTION HISTORY" in line.upper():
                transaction_start = i
                break

        if transaction_start == -1:
            return transactions

        opening_balance = self._extract_opening_balance(text)

        # Date pattern for UOB: DD MMM YYYY
        date_pattern = re.compile(r"^(\d{2}\s+[A-Z]{3}\s+\d{4})\s+(.+)$")

        # Amount pattern: numbers with optional commas and mandatory decimals
        amount_pattern = re.compile(r"[\d,]+\.\d{2}")

        # First pass: collect raw transaction data.
        raw_transactions = []

        i = transaction_start + 1
        while i < len(lines):
            line = lines[i].strip()
            i += 1

            if not line:
                continue

            # Stop at end markers.
            if any(marker in line.upper() for marker in [
                "*** END", "END OF STATEMENT", "IMPORTANT:",
                "UNITED OVERSEAS BANK LIMITED",
            ]):
                break

            match = date_pattern.match(line)
            if not match:
                continue

            date_str = match.group(1)
            rest = match.group(2)

            # Collect continuation lines (lines without a date prefix).
            full_line = rest
            while i < len(lines):
                next_line = lines[i].strip()
                if not next_line:
                    i += 1
                    continue
                if date_pattern.match(next_line):
                    break
                if any(marker in next_line.upper() for marker in [
                    "*** END", "END OF STATEMENT", "IMPORTANT:",
                    "UNITED OVERSEAS BANK LIMITED",
                ]):
                    break
                full_line += " " + next_line
                i += 1

            amounts = amount_pattern.findall(full_line)
            if not amounts:
                continue

            parsed_amounts = [self._parse_amount(a) for a in amounts]

            raw_transactions.append({
                "date": date_str,
                "full_line": full_line,
                "amounts": amounts,
                "parsed_amounts": parsed_amounts,
            })

        # Second pass: classify transactions using balance tracking.
        prev_balance = opening_balance

        for raw_tx in raw_transactions:
            parsed_amounts = raw_tx["parsed_amounts"]
            amounts = raw_tx["amounts"]
            full_line = raw_tx["full_line"]
            date_str = raw_tx["date"]

            # The opening balance row has only a single amount (the balance).
            if len(parsed_amounts) == 1:
                if "OPENING BALANCE" in full_line.upper():
                    prev_balance = parsed_amounts[0]
                    continue
                # A lone amount is treated as a balance marker.
                prev_balance = parsed_amounts[0]
                continue

            # Last amount is the running balance; the one before is the amount.
            current_balance = parsed_amounts[-1]
            transaction_amount = parsed_amounts[-2]

            if prev_balance is not None:
                balance_change = current_balance - prev_balance
                transaction_type = "credit" if balance_change > 0 else "debit"
            else:
                transaction_type = self._infer_type_from_description(full_line)

            # Extract description (text before the amounts).
            desc_part = full_line
            for amt_str in amounts:
                desc_part = desc_part.replace(amt_str, "", 1)
            description = re.sub(r"\s{2,}", " ", desc_part).strip()

            raw_text = f"{date_str} {full_line}"

            transactions.append(Transaction(
                date=date_str,
                description=description,
                amount=transaction_amount,
                transaction_type=transaction_type,
                raw_text=raw_text,
            ))

            prev_balance = current_balance

        return transactions

    def identify_statement_period(self, text: str) -> Optional[str]:
        """Extract the statement date range from the UOB statement.

        UOB statements include "Statement Period: DD MMM YYYY TO DD MMM YYYY"
        in the header area.

        Args:
            text: The full extracted text from the UOB bank statement.

        Returns:
            The statement period string (e.g., "01 MAY 2026 TO 31 MAY 2026"),
            or None if it cannot be determined.
        """
        pattern = re.compile(
            r"Statement\s+Period\s*:\s*"
            r"(\d{1,2}\s+[A-Za-z]{3}\s+\d{4})\s+TO\s+(\d{1,2}\s+[A-Za-z]{3}\s+\d{4})",
            re.IGNORECASE,
        )
        match = pattern.search(text)
        if match:
            start_date = match.group(1).strip()
            end_date = match.group(2).strip()
            return f"{start_date} TO {end_date}"

        return None

    def _parse_amount(self, amount_str: str) -> float:
        """Parse a UOB-formatted amount string to a float.

        Handles:
        - Commas as thousand separators (e.g., "1,234.56")
        - Standard decimal format (e.g., "35.00")

        Args:
            amount_str: The amount string to parse.

        Returns:
            The parsed amount as a float.
        """
        cleaned = amount_str.replace(",", "")
        return float(cleaned)

    def _extract_opening_balance(self, text: str) -> Optional[float]:
        """Extract the opening balance from the UOB statement.

        Prefers the "STATEMENT OPENING BALANCE" transaction row, falling back to
        the ACCOUNT SUMMARY section.

        Args:
            text: The full extracted text from the UOB bank statement.

        Returns:
            The opening balance as a float, or None if not found.
        """
        lines = text.split("\n")

        # Primary: the opening balance transaction row.
        for line in lines:
            if "OPENING BALANCE" in line.upper():
                amounts = re.findall(r"[\d,]+\.\d{2}", line)
                if amounts:
                    return self._parse_amount(amounts[-1])

        # Fallback: ACCOUNT SUMMARY line "SGD 150,000.00 SGD ...".
        pattern = re.compile(
            r"OPENING\s+BALANCE.*?SGD\s+([\d,]+\.\d{2})",
            re.IGNORECASE | re.DOTALL,
        )
        match = pattern.search(text)
        if match:
            return self._parse_amount(match.group(1))

        return None

    def _infer_type_from_description(self, description: str) -> str:
        """Infer transaction type from description keywords when balance tracking unavailable.

        Args:
            description: The transaction description text.

        Returns:
            "credit" if description indicates money in, "debit" otherwise.
        """
        desc_upper = description.upper()

        credit_keywords = [
            "INWARD", "FAST INWARD", "GIRO INWARD", "DEPOSIT",
            "CREDIT", "RECEIVED", "INCOMING", "ADVANCE", "CAP INJ",
            "CAPITAL INJECTION", "SHAREHOLDER",
        ]
        debit_keywords = [
            "WITHDRAWAL", "TRANSFER OUT", "OUTWARD", "DEBIT",
            "GIRO - PAYROLL", "PAYROLL", "GIRO - SP", "GIRO - OFFICE",
            "LOAN REPAYMENT", "INTEREST CHARGE", "CABLE", "TELEX",
            "CHQ WITHDRAWAL", "TELE-TRANSFER", "RENTAL",
        ]

        for keyword in credit_keywords:
            if keyword in desc_upper:
                return "credit"
        for keyword in debit_keywords:
            if keyword in desc_upper:
                return "debit"

        return "debit"

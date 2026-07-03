"""Maybank statement parser implementation."""

import re
from typing import List, Optional

from src.parsers.base_parser import BaseBankParser, Transaction


class MaybankParser(BaseBankParser):
    """Parser for Maybank financial statements.

    Handles Maybank-specific statement formatting including:
    - Company name extraction from COMMERCIAL ACCOUNT STATEMENT header
    - Transaction table parsing (POST DATE, DESCRIPTION/PARTICULARS, REF NO., DEBIT, CREDIT, BALANCE)
    - Statement period extraction from "Period: DD MMM YYYY TO DD MMM YYYY"
    - MYR/SGD amount formatting with commas and decimals
    """

    def extract_company_name(self, text: str) -> Optional[str]:
        """Extract the account holder's company name from the Maybank statement header.

        Maybank statements place the company name on a line after the
        'Period:' line. The company name line also contains "Account No :" at the end.

        Args:
            text: The full extracted text from the Maybank bank statement.

        Returns:
            The company name if found, or None if it cannot be identified.
        """
        lines = text.split("\n")

        # Look for the company name on the line containing "Account No"
        for line in lines:
            if "Account No" in line:
                # Company name is everything before "Account No"
                name_part = line.split("Account No")[0].strip()
                if name_part:
                    return name_part
                break

        # Fallback: look for the line after "Period:" line
        for i, line in enumerate(lines):
            if line.strip().startswith("Period:") or "Period:" in line:
                # Next non-empty line should be the company name
                for j in range(i + 1, min(i + 5, len(lines))):
                    candidate = lines[j].strip()
                    if not candidate:
                        continue
                    if "Account No" in candidate:
                        name_part = candidate.split("Account No")[0].strip()
                        if name_part:
                            return name_part
                    elif (candidate
                          and "MARINA" not in candidate
                          and "SINGAPORE" not in candidate
                          and "Account Type" not in candidate
                          and "Currency" not in candidate):
                        return candidate
                break

        return None

    def extract_transactions(self, text: str) -> List[Transaction]:
        """Extract all transactions from the Maybank statement text.

        Maybank transaction tables have columns:
        - POST DATE (DD MMM YYYY)
        - DESCRIPTION / PARTICULARS
        - REF NO.
        - DEBIT (-) amount
        - CREDIT (+) amount
        - BALANCE

        The opening balance line does not have debit/credit amounts.
        Transaction type is determined by comparing consecutive balances.

        Args:
            text: The full extracted text from the Maybank bank statement.

        Returns:
            A list of Transaction objects parsed from the statement.
        """
        transactions: List[Transaction] = []
        lines = text.split("\n")

        # Find the start of the transaction section
        transaction_start = -1
        for i, line in enumerate(lines):
            if "TRANSACTION POSTINGS" in line.upper():
                transaction_start = i
                break

        if transaction_start == -1:
            return transactions

        # Skip header rows (POST DATE, DESCRIPTION, etc.)
        # Find the actual first data line after the column header
        data_start = transaction_start + 1
        for i in range(transaction_start + 1, min(transaction_start + 5, len(lines))):
            if "POST DATE" in lines[i].upper() or "DESCRIPTION" in lines[i].upper():
                data_start = i + 1

        # Date pattern for Maybank: DD MMM YYYY
        date_pattern = re.compile(r"^(\d{2}\s+[A-Z]{3}\s+\d{4})\s+(.+)$")

        # Amount pattern: numbers with optional commas and mandatory decimals
        amount_pattern = re.compile(r"[\d,]+\.\d{2}")

        # Collect raw transaction data
        raw_transactions = []

        i = data_start
        while i < len(lines):
            line = lines[i].strip()
            i += 1

            # Skip empty lines
            if not line:
                continue

            # Stop at end markers
            if any(marker in line.upper() for marker in [
                "NOTICE:", "END OF TRANSACTION", "MAYBANK SINGAPORE",
                "-- END"
            ]):
                break

            # Try to match a transaction line starting with a date
            match = date_pattern.match(line)
            if not match:
                continue

            date_str = match.group(1)
            rest = match.group(2)

            # Collect continuation lines (lines without a date prefix)
            full_line = rest
            while i < len(lines):
                next_line = lines[i].strip()
                if not next_line:
                    i += 1
                    continue
                if date_pattern.match(next_line):
                    break
                if any(marker in next_line.upper() for marker in [
                    "NOTICE:", "END OF TRANSACTION", "MAYBANK SINGAPORE",
                    "-- END"
                ]):
                    break
                full_line += " " + next_line
                i += 1

            # Parse amounts from the full line
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

        # Process transactions using balance tracking
        # First entry is typically the opening balance (single amount = balance only)
        prev_balance: Optional[float] = None

        for raw_tx in raw_transactions:
            parsed_amounts = raw_tx["parsed_amounts"]
            amounts = raw_tx["amounts"]
            full_line = raw_tx["full_line"]
            date_str = raw_tx["date"]

            # If only one amount, this is the opening balance line
            if len(parsed_amounts) == 1:
                if "OPENING BALANCE" in full_line.upper():
                    prev_balance = parsed_amounts[0]
                    continue
                # Single amount could also be the balance itself
                prev_balance = parsed_amounts[0]
                continue

            # Last amount is the running balance
            current_balance = parsed_amounts[-1]

            # Transaction amount is the one before the balance
            transaction_amount = parsed_amounts[-2] if len(parsed_amounts) >= 2 else 0.0

            # Determine type from balance change
            if prev_balance is not None:
                balance_change = current_balance - prev_balance
                if balance_change > 0:
                    transaction_type = "credit"
                else:
                    transaction_type = "debit"
            else:
                # Fallback: use description keywords
                transaction_type = self._infer_type_from_description(full_line)

            # Extract description (text before the amounts)
            desc_part = full_line
            for amt_str in amounts:
                desc_part = desc_part.replace(amt_str, "", 1)
            description = desc_part.strip()
            # Clean up multiple spaces
            description = re.sub(r"\s{2,}", " ", description)

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
        """Extract the statement date range from the Maybank statement.

        Maybank statements include "Period: DD MMM YYYY TO DD MMM YYYY"
        in the header area.

        Args:
            text: The full extracted text from the Maybank bank statement.

        Returns:
            The statement period string (e.g., "01 MAY 2026 TO 31 MAY 2026"),
            or None if it cannot be determined.
        """
        # Pattern: Period: DD MMM YYYY TO DD MMM YYYY
        pattern = re.compile(
            r"Period\s*:\s*(\d{1,2}\s+[A-Z]{3}\s+\d{4})\s+TO\s+(\d{1,2}\s+[A-Z]{3}\s+\d{4})",
            re.IGNORECASE,
        )
        match = pattern.search(text)
        if match:
            start_date = match.group(1).strip()
            end_date = match.group(2).strip()
            return f"{start_date} TO {end_date}"

        return None

    def _parse_amount(self, amount_str: str) -> float:
        """Parse a Maybank-formatted amount string to a float.

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
            "CREDIT", "RECEIVED", "INCOMING", "DIRECTOR'S ADVANCE",
            "CAP INJECTION",
        ]
        debit_keywords = [
            "WITHDRAWAL", "TRANSFER OUT", "OUTWARD", "DEBIT",
            "GIRO - SALARY", "GIRO-SALARY", "SALARY PAYMENT",
            "LOAN REPAYMENT", "LOAN INTEREST", "CABLE",
            "TELEX", "CHEQUE", "OFFICE RENTAL",
            "SP SERVICES", "TELEGRAPHIC",
        ]

        for keyword in credit_keywords:
            if keyword in desc_upper:
                return "credit"
        for keyword in debit_keywords:
            if keyword in desc_upper:
                return "debit"

        return "debit"

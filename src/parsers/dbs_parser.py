"""DBS Bank statement parser implementation."""

import re
from typing import List, Optional

from src.parsers.base_parser import BaseBankParser, Transaction


class DBSParser(BaseBankParser):
    """Parser for DBS Bank financial statements.

    Handles DBS-specific statement formatting including:
    - Company name extraction from header area
    - Transaction table parsing (date, description, reference, withdrawals, deposits, balance)
    - Statement period extraction
    - SGD amount formatting with commas and decimals
    """

    def extract_company_name(self, text: str) -> Optional[str]:
        lines = [line.strip() for line in text.splitlines() if line.strip()]

        # Find "Account Number"
        account_idx = None
        for i, line in enumerate(lines):
            if "ACCOUNT NUMBER" in line.upper():
                account_idx = i
                break

        if account_idx is None:
            return None

        # Search upwards for something that looks like a company name
        for j in range(account_idx - 1, max(account_idx - 8, -1), -1):
            candidate = lines[j]

            upper = candidate.upper()

            # Skip address/header lines
            if (
                "SINGAPORE" in upper
                or "ACCOUNT" in upper
                or "STATEMENT" in upper
                or "BALANCE" in upper
                or upper.startswith("#")
                or re.search(r"\d{6}", candidate)  # postal code
                or re.search(r"^\d", candidate)    # street number
            ):
                continue

            return candidate

        return None

    def extract_transactions(self, text: str) -> List[Transaction]:
        """Extract all transactions from the DBS statement text.

        DBS transaction tables have columns:
        - Transaction Date (DD MMM YYYY)
        - Description
        - Reference Number
        - Withdrawals (-)
        - Deposits (+)
        - Balance

        Multi-line descriptions are continued on the next line without a date.
        Transaction type is determined by tracking balance changes between
        consecutive transactions.

        Args:
            text: The full extracted text from the DBS bank statement.

        Returns:
            A list of Transaction objects parsed from the statement.
        """
        transactions: List[Transaction] = []
        lines = text.split("\n")

        # Extract opening balance from the account summary
        opening_balance = self._extract_opening_balance(text)

        # Find the start of the transaction section
        transaction_start = -1
        for i, line in enumerate(lines):
            if "Transaction" in line and "Date" in line:
                transaction_start = i
                break
            if re.search(r"^Date\b", line.strip()):
                transaction_start = i
                break

        if transaction_start == -1:
            # Try alternate header pattern
            for i, line in enumerate(lines):
                if "TRANSACTION DETAILS" in line.upper():
                    transaction_start = i
                    break

        if transaction_start == -1:
            return transactions

        # Date pattern for DBS: DD MMM YYYY
        date_pattern = re.compile(r"^(\d{2}\s+[A-Z]{3}\s+\d{4})\s+(.+)$")

        # Amount pattern: numbers with optional commas and mandatory decimals
        amount_pattern = re.compile(r"[\d,]+\.\d{2}")

        # First pass: collect raw transaction data (amounts + balance)
        raw_transactions = []

        i = transaction_start + 1
        while i < len(lines):
            line = lines[i].strip()
            i += 1

            # Skip empty lines and section boundaries
            if not line:
                continue

            # Stop at end markers
            if any(marker in line.upper() for marker in [
                "IMPORTANT NOTICE", "END OF STATEMENT",
                "DBS BANK LTD", "Page "
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
                # If next line starts with a date or a stop marker, stop collecting
                if date_pattern.match(next_line):
                    break
                if any(marker in next_line.upper() for marker in [
                    "IMPORTANT NOTICE", "END OF STATEMENT",
                    "DBS BANK LTD", "Page "
                ]):
                    break
                # This is a continuation line
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

        # Second pass: determine transaction types using balance tracking
        prev_balance = opening_balance

        for raw_tx in raw_transactions:
            parsed_amounts = raw_tx["parsed_amounts"]
            amounts = raw_tx["amounts"]
            full_line = raw_tx["full_line"]
            date_str = raw_tx["date"]

            # Last amount is always the running balance
            current_balance = parsed_amounts[-1]

            # Transaction amount is second-to-last
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
        """Extract the statement date range from the DBS statement.

        DBS statements include "STATEMENT PERIOD: DD MMM YYYY - DD MMM YYYY"
        in the header area.

        Args:
            text: The full extracted text from the DBS bank statement.

        Returns:
            The statement period string (e.g., "01 MAY 2026 - 31 MAY 2026"),
            or None if it cannot be determined.
        """
        # Pattern: STATEMENT PERIOD: DD MMM YYYY - DD MMM YYYY
        pattern = re.compile(
            r"STATEMENT\s+PERIOD\s*:\s*"
            r"(\d{1,2}\s+[A-Z]{3}\s+\d{4})\s*-\s*(\d{1,2}\s+[A-Z]{3}\s+\d{4})",
            re.IGNORECASE,
        )
        match = pattern.search(text)
        if match:
            start_date = match.group(1).strip()
            end_date = match.group(2).strip()
            return f"{start_date} - {end_date}"

        return None

    def _parse_amount(self, amount_str: str) -> float:
        """Parse a DBS-formatted amount string to a float.

        Handles:
        - Commas as thousand separators (e.g., "1,234.56")
        - Standard decimal format (e.g., "35.00")

        Args:
            amount_str: The amount string to parse.

        Returns:
            The parsed amount as a float.
        """
        # Remove commas and convert to float
        cleaned = amount_str.replace(",", "")
        return float(cleaned)

    def _extract_opening_balance(self, text: str) -> Optional[float]:
        """Extract the opening balance from the DBS account summary section.

        Looks for the Opening Balance value in the ACCOUNT SUMMARY section.

        Args:
            text: The full extracted text from the DBS bank statement.

        Returns:
            The opening balance as a float, or None if not found.
        """
        # Pattern: "Opening Balance" followed by amounts on same or next line
        # In DBS format: "SGD 500,000.00" or just the number
        pattern = re.compile(
            r"Opening\s+Balance.*?SGD\s+([\d,]+\.\d{2})",
            re.IGNORECASE | re.DOTALL,
        )
        match = pattern.search(text)
        if match:
            return self._parse_amount(match.group(1))

        # Fallback: look for the opening balance line in summary table
        lines = text.split("\n")
        for i, line in enumerate(lines):
            if "Opening Balance" in line:
                # Look for SGD amount on same line or next lines
                amounts = re.findall(r"[\d,]+\.\d{2}", line)
                if amounts:
                    return self._parse_amount(amounts[0])
                # Check next line
                if i + 1 < len(lines):
                    amounts = re.findall(r"[\d,]+\.\d{2}", lines[i + 1])
                    if amounts:
                        return self._parse_amount(amounts[0])

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
            "INWARD", "PAYMENT IN", "DEPOSIT", "CREDIT",
            "RECEIVED", "INCOMING",
        ]
        debit_keywords = [
            "WITHDRAWAL", "TRANSFER OUT", "DEBIT", "GIRO-SALARY",
            "GIRO-OFFICE", "DIRECT DEBIT", "CHQ WITHDRAWAL",
            "CABLE CHG", "TELEX CHG",
        ]

        for keyword in credit_keywords:
            if keyword in desc_upper:
                return "credit"
        for keyword in debit_keywords:
            if keyword in desc_upper:
                return "debit"

        return "debit"

"""OCBC Bank statement parser implementation."""

import re
from typing import List, Optional

from src.parsers.base_parser import BaseBankParser, Transaction


class OCBCParser(BaseBankParser):
    """Parser for OCBC Bank financial statements.

    Handles OCBC-specific statement formatting including:
    - Company name extraction from BUSINESS ACCOUNT STATEMENT header
    - Transaction table parsing (date, description, reference, debits, credits, balance)
    - Statement period extraction from "Statement Period: DD MMM YYYY to DD MMM YYYY"
    - SGD amount formatting with commas and decimals
    """

    def extract_company_name(self, text: str) -> Optional[str]:
        """Extract the account holder's company name from the OCBC statement header.

        OCBC statements place the company name on the line following the
        'BUSINESS ACCOUNT STATEMENT' header line. The company name may share
        the same line as "Account Number" (e.g.,
        "TECH INNOVATION PTE. LTD. Account Number : 501-884921-001").

        Args:
            text: The full extracted text from the OCBC bank statement.

        Returns:
            The company name if found, or None if it cannot be identified.
        """
        lines = text.split("\n")

        for i, line in enumerate(lines):
            # Look for the BUSINESS ACCOUNT STATEMENT line which contains the period
            if "BUSINESS ACCOUNT STATEMENT" in line.upper():
                # The company name is on the next non-empty line
                for j in range(i + 1, min(i + 5, len(lines))):
                    candidate = lines[j].strip()
                    if not candidate:
                        continue
                    # The company name and Account Number may be on the same line
                    if "Account Number" in candidate:
                        name_part = candidate.split("Account Number")[0].strip()
                        if name_part:
                            return name_part
                        # If nothing before Account Number, keep looking
                        continue
                    # Skip pure account info lines
                    if "Account Type" in candidate or "Currency" in candidate:
                        continue
                    # Return the first substantive line
                    return candidate
                break

        # Fallback: look for a line containing Account Number and extract name from before it
        for i, line in enumerate(lines):
            if "Account Number" in line:
                # Check if company name is on the same line before "Account Number"
                name_part = line.split("Account Number")[0].strip()
                if name_part:
                    return name_part
                # Otherwise look at preceding lines
                for j in range(i - 1, max(i - 5, -1), -1):
                    candidate = lines[j].strip()
                    if (candidate
                            and "STATEMENT" not in candidate.upper()
                            and "BANKING" not in candidate.upper()
                            and "PERIOD" not in candidate.upper()
                            and "OCBC" not in candidate.upper()
                            and not candidate.startswith("Statement")):
                        return candidate
                break

        return None

    def extract_transactions(self, text: str) -> List[Transaction]:
        """Extract all transactions from the OCBC statement text.

        OCBC transaction tables have columns:
        - Transaction Date (DD MMM YYYY)
        - Transaction Description
        - Reference No.
        - Debits (-)
        - Credits (+)
        - Balance

        The transaction type is determined by which column the amount falls in
        (debit or credit), tracked via balance changes between consecutive rows.

        Args:
            text: The full extracted text from the OCBC bank statement.

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
            if "TRANSACTION DETAILS" in line.upper():
                transaction_start = i
                break

        if transaction_start == -1:
            return transactions

        # Date pattern for OCBC: DD MMM YYYY
        date_pattern = re.compile(r"^(\d{2}\s+[A-Z]{3}\s+\d{4})\s+(.+)$")

        # Amount pattern: numbers with optional commas and mandatory decimals
        amount_pattern = re.compile(r"[\d,]+\.\d{2}")

        # First pass: collect raw transaction data
        raw_transactions = []

        i = transaction_start + 1
        while i < len(lines):
            line = lines[i].strip()
            i += 1

            # Skip empty lines
            if not line:
                continue

            # Skip the sub-header lines (Transaction Date, Description, etc.)
            if line.startswith("Transaction") and ("Date" in line or "Description" in line):
                continue
            if line == "Date":
                continue

            # Stop at end markers
            if any(marker in line.upper() for marker in [
                "END OF STATEMENT", "NOTE:", "OVERSEA-CHINESE",
                "*** END", "Page "
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
                    "END OF STATEMENT", "NOTE:", "OVERSEA-CHINESE",
                    "*** END", "Page "
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

            # Transaction amount is second-to-last (or first if only 2 amounts)
            if len(parsed_amounts) >= 2:
                transaction_amount = parsed_amounts[-2]
            else:
                transaction_amount = parsed_amounts[0]

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
        """Extract the statement date range from the OCBC statement.

        OCBC statements include "Statement Period: DD MMM YYYY to DD MMM YYYY"
        in the header area.

        Args:
            text: The full extracted text from the OCBC bank statement.

        Returns:
            The statement period string (e.g., "01 May 2026 to 31 May 2026"),
            or None if it cannot be determined.
        """
        # Pattern: Statement Period: DD MMM YYYY to DD MMM YYYY
        pattern = re.compile(
            r"Statement\s+Period\s*:\s*"
            r"(\d{1,2}\s+[A-Za-z]{3}\s+\d{4})\s+to\s+(\d{1,2}\s+[A-Za-z]{3}\s+\d{4})",
            re.IGNORECASE,
        )
        match = pattern.search(text)
        if match:
            start_date = match.group(1).strip()
            end_date = match.group(2).strip()
            return f"{start_date} to {end_date}"

        return None

    def _parse_amount(self, amount_str: str) -> float:
        """Parse an OCBC-formatted amount string to a float.

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
        """Extract the opening balance from the OCBC account summary section.

        Looks for the Opening Balance value in the ACCOUNT SUMMARY section.

        Args:
            text: The full extracted text from the OCBC bank statement.

        Returns:
            The opening balance as a float, or None if not found.
        """
        # Pattern: "Opening Balance" ... "SGD X,XXX.XX"
        pattern = re.compile(
            r"Opening\s+Balance.*?SGD\s+([\d,]+\.\d{2})",
            re.IGNORECASE | re.DOTALL,
        )
        match = pattern.search(text)
        if match:
            return self._parse_amount(match.group(1))

        # Fallback: look for "Opening Balance" line and find amount
        lines = text.split("\n")
        for i, line in enumerate(lines):
            if "Opening Balance" in line:
                amounts = re.findall(r"[\d,]+\.\d{2}", line)
                if amounts:
                    return self._parse_amount(amounts[0])
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
            "INWARD", "FAST INWARD", "GIRO INWARD", "DEPOSIT",
            "CREDIT", "RECEIVED", "INCOMING",
        ]
        debit_keywords = [
            "WITHDRAWAL", "TRANSFER OUT", "OUTWARD", "DEBIT",
            "GIRO - SALARY", "GIRO - SP", "GIRO - OFFICE",
            "LOAN REPAYMENT", "LOAN INTEREST", "CABLE CHARGE",
            "CHEQUE WITHDRAWAL", "TELEGRAPHIC",
        ]

        for keyword in credit_keywords:
            if keyword in desc_upper:
                return "credit"
        for keyword in debit_keywords:
            if keyword in desc_upper:
                return "debit"

        return "debit"

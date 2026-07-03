"""Loan repayment identification utility.

Scans debit transactions for loan repayment patterns and aggregates the
identified repayments into a count and total amount.

Validates: Requirements 5.1, 5.2, 5.3, 5.4
"""

import re
from typing import Dict, List, Optional

from src.parsers.base_parser import LoanRepayment, Transaction


class LoanDetector:
    """Identifies loan repayment transactions within a list of transactions.

    Loan repayments are detected by matching debit transaction descriptions
    against a set of known loan-related keyword patterns (case-insensitive).
    Only debit transactions are considered, since loan repayments are money
    flowing out of the account.

    The detector is careful with short/ambiguous abbreviations such as "HP"
    (hire purchase): these require a word boundary match to avoid false
    positives from substrings (e.g., "SHIPMENT" or "PHP").
    """

    # Keyword patterns mapped to a human-readable loan type classification.
    # Each entry is (regex_pattern, loan_type). Patterns are compiled with
    # IGNORECASE so matching is case-insensitive. Word boundaries (\b) prevent
    # partial-word false positives.
    _KEYWORD_PATTERNS = [
        (r"\bmortgage\b", "mortgage"),
        (r"\bhire\s+purchase\b", "hire purchase"),
        (r"\bterm\s+loan\b", "term loan"),
        (r"\bloan\b", "loan"),
        (r"\binstal?lment\b", "instalment"),  # matches "instalment" and "installment"
        (r"\brepayment\b", "repayment"),
        (r"\bfinancing\b", "financing"),
        # "HP" is a risky abbreviation: require it to stand alone as a whole
        # token (word boundaries on both sides) to avoid matching substrings.
        (r"\bHP\b", "hire purchase"),
    ]

    def __init__(self) -> None:
        """Compile the keyword patterns for efficient repeated matching."""
        self._compiled_patterns = [
            (re.compile(pattern, re.IGNORECASE), loan_type)
            for pattern, loan_type in self._KEYWORD_PATTERNS
        ]

    def _match_loan_type(self, description: str) -> Optional[str]:
        """Return the loan type if the description matches a loan keyword.

        Patterns are evaluated in priority order (most specific first) so a
        description like "TERM LOAN REPAYMENT" is classified as "term loan"
        rather than the more generic "loan" or "repayment".

        Args:
            description: The transaction description to scan.

        Returns:
            The matched loan type string, or None if no pattern matches.
        """
        if not description:
            return None

        for compiled, loan_type in self._compiled_patterns:
            if compiled.search(description):
                return loan_type
        return None

    def detect(self, transactions: List[Transaction]) -> Dict:
        """Identify loan repayments among the given transactions.

        Only debit transactions are scanned. Each debit whose description
        matches a loan keyword pattern is wrapped in a LoanRepayment with its
        classified loan type.

        Args:
            transactions: The list of Transaction objects to analyze.

        Returns:
            A dict with keys:
                - "count": number of loan repayment transactions identified.
                - "total_amount": sum of the identified repayment amounts.
                - "repayments": list of LoanRepayment objects.
        """
        repayments: List[LoanRepayment] = []

        for tx in transactions or []:
            # Only debit transactions can be loan repayments (money out).
            if (tx.transaction_type or "").lower() != "debit":
                continue

            loan_type = self._match_loan_type(tx.description)
            if loan_type is not None:
                repayments.append(LoanRepayment(transaction=tx, loan_type=loan_type))

        total_amount = round(sum(r.transaction.amount for r in repayments), 2)

        return {
            "count": len(repayments),
            "total_amount": total_amount,
            "repayments": repayments,
        }

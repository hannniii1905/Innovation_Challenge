"""Abstract base parser class and shared data models for bank statement parsing."""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import List, Optional


@dataclass
class Transaction:
    """Represents a single financial transaction from a bank statement.

    Attributes:
        date: Transaction date as a string (format varies by bank).
        description: Description or narrative of the transaction.
        amount: Transaction amount in SGD.
        transaction_type: Either "credit" (money in) or "debit" (money out).
        raw_text: The original text line from which this transaction was parsed.
    """

    date: str
    description: str
    amount: float
    transaction_type: str  # "credit" or "debit"
    raw_text: str


@dataclass
class LoanRepayment:
    """Represents a loan repayment transaction identified within debit entries.

    Wraps a Transaction with additional loan-specific metadata.

    Attributes:
        transaction: The underlying debit transaction identified as a loan repayment.
        loan_type: Optional classification of the loan (e.g., "mortgage", "hire purchase").
    """

    transaction: Transaction
    loan_type: Optional[str] = None


@dataclass
class SuspiciousCredit:
    """Represents a credit transaction flagged as potentially fraudulent.

    Attributes:
        transaction: The credit transaction that was flagged.
        risk_score: Confidence score between 0.0 and 1.0 indicating fraud likelihood.
        reason: Human-readable explanation of why the transaction was flagged.
    """

    transaction: Transaction
    risk_score: float  # 0.0 to 1.0
    reason: str


class BaseBankParser(ABC):
    """Abstract base class defining the interface for all bank statement parsers.

    Each supported bank (DBS, OCBC, Maybank, UOB) must implement a parser that
    inherits from this class and provides bank-specific logic for extracting
    company names, transactions, and statement periods.
    """

    @abstractmethod
    def extract_company_name(self, text: str) -> Optional[str]:
        """Extract the account holder's company name from the statement text.

        Args:
            text: The full extracted text from the bank statement.

        Returns:
            The company name if found, or None if it cannot be identified.
        """
        ...

    @abstractmethod
    def extract_transactions(self, text: str) -> List[Transaction]:
        """Extract all transactions from the statement text.

        Args:
            text: The full extracted text from the bank statement.

        Returns:
            A list of Transaction objects parsed from the statement.
        """
        ...

    @abstractmethod
    def identify_statement_period(self, text: str) -> Optional[str]:
        """Identify the statement period (date range) from the statement text.

        Args:
            text: The full extracted text from the bank statement.

        Returns:
            The statement period as a string (e.g., "01 Jan 2024 - 31 Jan 2024"),
            or None if it cannot be determined.
        """
        ...

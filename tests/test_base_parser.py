"""Tests for the base parser abstract class and data models."""

import pytest
from dataclasses import fields, is_dataclass
from typing import List, Optional

from src.parsers.base_parser import (
    BaseBankParser,
    LoanRepayment,
    SuspiciousCredit,
    Transaction,
)


class TestTransactionDataclass:
    """Tests for the Transaction dataclass."""

    def test_transaction_is_dataclass(self):
        assert is_dataclass(Transaction)

    def test_transaction_fields(self):
        field_names = [f.name for f in fields(Transaction)]
        assert field_names == ["date", "description", "amount", "transaction_type", "raw_text"]

    def test_transaction_field_types(self):
        field_types = {f.name: f.type for f in fields(Transaction)}
        assert field_types["date"] is str
        assert field_types["description"] is str
        assert field_types["amount"] is float
        assert field_types["transaction_type"] is str
        assert field_types["raw_text"] is str

    def test_transaction_creation_credit(self):
        t = Transaction(
            date="2024-01-15",
            description="SALARY PAYMENT",
            amount=5000.00,
            transaction_type="credit",
            raw_text="15 Jan 2024  SALARY PAYMENT  5,000.00",
        )
        assert t.date == "2024-01-15"
        assert t.description == "SALARY PAYMENT"
        assert t.amount == 5000.00
        assert t.transaction_type == "credit"
        assert t.raw_text == "15 Jan 2024  SALARY PAYMENT  5,000.00"

    def test_transaction_creation_debit(self):
        t = Transaction(
            date="2024-01-20",
            description="RENT PAYMENT",
            amount=2000.00,
            transaction_type="debit",
            raw_text="20 Jan 2024  RENT PAYMENT  2,000.00",
        )
        assert t.transaction_type == "debit"
        assert t.amount == 2000.00

    def test_transaction_equality(self):
        t1 = Transaction("2024-01-15", "TEST", 100.0, "credit", "raw")
        t2 = Transaction("2024-01-15", "TEST", 100.0, "credit", "raw")
        assert t1 == t2


class TestLoanRepaymentDataclass:
    """Tests for the LoanRepayment dataclass."""

    def test_loan_repayment_is_dataclass(self):
        assert is_dataclass(LoanRepayment)

    def test_loan_repayment_wraps_transaction(self):
        t = Transaction("2024-01-01", "LOAN REPAYMENT", 1500.00, "debit", "raw")
        lr = LoanRepayment(transaction=t, loan_type="mortgage")
        assert lr.transaction == t
        assert lr.loan_type == "mortgage"

    def test_loan_repayment_optional_loan_type(self):
        t = Transaction("2024-01-01", "INSTALMENT", 500.00, "debit", "raw")
        lr = LoanRepayment(transaction=t)
        assert lr.loan_type is None

    def test_loan_repayment_fields(self):
        field_names = [f.name for f in fields(LoanRepayment)]
        assert "transaction" in field_names
        assert "loan_type" in field_names


class TestSuspiciousCreditDataclass:
    """Tests for the SuspiciousCredit dataclass."""

    def test_suspicious_credit_is_dataclass(self):
        assert is_dataclass(SuspiciousCredit)

    def test_suspicious_credit_creation(self):
        t = Transaction("2024-01-28", "TRANSFER", 50000.00, "credit", "raw")
        sc = SuspiciousCredit(
            transaction=t,
            risk_score=0.85,
            reason="Round number transfer near statement end",
        )
        assert sc.transaction == t
        assert sc.risk_score == 0.85
        assert sc.reason == "Round number transfer near statement end"

    def test_suspicious_credit_fields(self):
        field_names = [f.name for f in fields(SuspiciousCredit)]
        assert field_names == ["transaction", "risk_score", "reason"]

    def test_suspicious_credit_risk_score_range(self):
        """Risk score should be between 0.0 and 1.0 by convention."""
        t = Transaction("2024-01-15", "TEST", 1000.0, "credit", "raw")
        sc_low = SuspiciousCredit(transaction=t, risk_score=0.0, reason="low risk")
        sc_high = SuspiciousCredit(transaction=t, risk_score=1.0, reason="high risk")
        assert 0.0 <= sc_low.risk_score <= 1.0
        assert 0.0 <= sc_high.risk_score <= 1.0


class TestBaseBankParser:
    """Tests for the BaseBankParser abstract base class."""

    def test_cannot_instantiate_directly(self):
        with pytest.raises(TypeError):
            BaseBankParser()

    def test_concrete_implementation(self):
        """A concrete implementation that provides all abstract methods works."""

        class ConcreteParser(BaseBankParser):
            def extract_company_name(self, text: str) -> Optional[str]:
                return "Test Company Pte Ltd"

            def extract_transactions(self, text: str) -> List[Transaction]:
                return [
                    Transaction("2024-01-01", "TEST", 100.0, "credit", "raw line")
                ]

            def identify_statement_period(self, text: str) -> Optional[str]:
                return "01 Jan 2024 - 31 Jan 2024"

        parser = ConcreteParser()
        assert parser.extract_company_name("sample text") == "Test Company Pte Ltd"
        assert len(parser.extract_transactions("sample text")) == 1
        assert parser.identify_statement_period("sample text") == "01 Jan 2024 - 31 Jan 2024"

    def test_incomplete_implementation_raises(self):
        """A class that doesn't implement all abstract methods cannot be instantiated."""

        class IncompleteParser(BaseBankParser):
            def extract_company_name(self, text: str) -> Optional[str]:
                return None

        with pytest.raises(TypeError):
            IncompleteParser()

    def test_abstract_methods_exist(self):
        abstract_methods = BaseBankParser.__abstractmethods__
        assert "extract_company_name" in abstract_methods
        assert "extract_transactions" in abstract_methods
        assert "identify_statement_period" in abstract_methods

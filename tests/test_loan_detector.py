"""Tests for the loan repayment detector."""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from src.loan_detector import LoanDetector
from src.parsers.base_parser import LoanRepayment, Transaction


def _tx(description, amount=1000.0, transaction_type="debit", date="04 MAY 2026"):
    """Helper to build a Transaction with sensible defaults."""
    return Transaction(
        date=date,
        description=description,
        amount=amount,
        transaction_type=transaction_type,
        raw_text=f"{date} {description} {amount}",
    )


class TestLoanDetectorBasicMatching:
    """Tests for matching loan repayment keywords in debit descriptions."""

    def test_detects_term_loan_repayment(self):
        """Identifies a DBS-style term loan repayment debit."""
        txs = [_tx("DEBIT ADVISE - TERM LOAN REPAYMENT", amount=8200.00)]
        result = LoanDetector().detect(txs)
        assert result["count"] == 1
        assert result["total_amount"] == 8200.00
        assert result["repayments"][0].loan_type == "term loan"

    def test_detects_mortgage(self):
        """Identifies a mortgage payment."""
        result = LoanDetector().detect([_tx("MONTHLY MORTGAGE PAYMENT", amount=3500.0)])
        assert result["count"] == 1
        assert result["repayments"][0].loan_type == "mortgage"

    def test_detects_instalment_and_installment_spellings(self):
        """Both 'instalment' and 'installment' spellings are detected."""
        txs = [
            _tx("CAR INSTALMENT", amount=600.0),
            _tx("EQUIPMENT INSTALLMENT", amount=700.0),
        ]
        result = LoanDetector().detect(txs)
        assert result["count"] == 2
        for r in result["repayments"]:
            assert r.loan_type == "instalment"

    def test_detects_financing(self):
        """Identifies a financing repayment."""
        result = LoanDetector().detect([_tx("ASSET FINANCING DEDUCTION", amount=900.0)])
        assert result["count"] == 1
        assert result["repayments"][0].loan_type == "financing"

    def test_detects_repayment_keyword(self):
        """Identifies a generic repayment debit."""
        result = LoanDetector().detect([_tx("LOAN REPAYMENT GIRO", amount=1200.0)])
        assert result["count"] == 1
        # "loan" appears, classified by the most specific matching pattern.
        assert result["repayments"][0].loan_type in {"loan", "repayment"}

    def test_returns_loan_repayment_objects(self):
        """Repayments are returned as LoanRepayment instances wrapping the transaction."""
        tx = _tx("HOME LOAN", amount=2000.0)
        result = LoanDetector().detect([tx])
        rep = result["repayments"][0]
        assert isinstance(rep, LoanRepayment)
        assert rep.transaction is tx


class TestLoanDetectorCaseInsensitivity:
    """Tests for case-insensitive matching."""

    def test_lowercase_description_matches(self):
        result = LoanDetector().detect([_tx("home loan repayment", amount=1500.0)])
        assert result["count"] == 1

    def test_mixed_case_description_matches(self):
        result = LoanDetector().detect([_tx("Hire Purchase Deduction", amount=450.0)])
        assert result["count"] == 1
        assert result["repayments"][0].loan_type == "hire purchase"


class TestLoanDetectorDebitOnly:
    """Tests confirming only debit transactions are scanned."""

    def test_ignores_credit_loan_disbursement(self):
        """A credit with loan keywords (e.g., disbursement) is not a repayment."""
        txs = [_tx("LOAN DISBURSEMENT", amount=50000.0, transaction_type="credit")]
        result = LoanDetector().detect(txs)
        assert result["count"] == 0
        assert result["total_amount"] == 0
        assert result["repayments"] == []

    def test_mixed_credit_and_debit(self):
        """Only the debit loan repayment is counted."""
        txs = [
            _tx("LOAN DISBURSEMENT", amount=50000.0, transaction_type="credit"),
            _tx("TERM LOAN REPAYMENT", amount=2500.0, transaction_type="debit"),
        ]
        result = LoanDetector().detect(txs)
        assert result["count"] == 1
        assert result["total_amount"] == 2500.00


class TestLoanDetectorAbbreviationEdgeCases:
    """Tests for the 'HP' abbreviation and false-positive avoidance."""

    def test_hp_standalone_token_matches(self):
        """'HP' as a standalone token is treated as hire purchase."""
        result = LoanDetector().detect([_tx("HP DEDUCTION VEHICLE", amount=800.0)])
        assert result["count"] == 1
        assert result["repayments"][0].loan_type == "hire purchase"

    def test_hp_inside_word_does_not_match(self):
        """'HP' embedded in another word does not trigger a match (no word boundary)."""
        # "SHPMENT" / "PHP" style substrings should not match.
        txs = [
            _tx("SHIPMENT CHARGE", amount=120.0),
            _tx("PHP HOSTING FEE", amount=60.0),
        ]
        result = LoanDetector().detect(txs)
        # "PHP" has its own word boundaries but is not "HP"; "SHIPMENT" contains
        # no standalone HP. Neither should be flagged as a loan.
        assert result["count"] == 0

    def test_loan_substring_does_not_falsely_match(self):
        """A word merely containing 'loan' as a substring is not matched."""
        # e.g. "BALOONED" or "SLOAN" -> word boundary prevents a match.
        result = LoanDetector().detect([_tx("PAYMENT TO SLOAN ENTERPRISES", amount=300.0)])
        assert result["count"] == 0


class TestLoanDetectorAggregation:
    """Tests for count and total amount aggregation."""

    def test_multiple_repayments_summed(self):
        txs = [
            _tx("TERM LOAN REPAYMENT", amount=8200.00),
            _tx("CAR INSTALMENT", amount=600.50),
            _tx("MORTGAGE PAYMENT", amount=3500.25),
            _tx("OFFICE RENT", amount=4000.0),  # not a loan
        ]
        result = LoanDetector().detect(txs)
        assert result["count"] == 3
        assert result["total_amount"] == 12300.75

    def test_empty_transaction_list(self):
        result = LoanDetector().detect([])
        assert result["count"] == 0
        assert result["total_amount"] == 0
        assert result["repayments"] == []

    def test_none_transaction_list(self):
        """Gracefully handles None input."""
        result = LoanDetector().detect(None)
        assert result["count"] == 0
        assert result["repayments"] == []

    def test_no_loans_present(self):
        txs = [
            _tx("OFFICE RENT", amount=4000.0),
            _tx("UTILITIES", amount=250.0),
        ]
        result = LoanDetector().detect(txs)
        assert result["count"] == 0
        assert result["total_amount"] == 0


class TestLoanDetectorMultilingualAndPartial:
    """Tests for multilingual descriptions and partial-match handling."""

    def test_keyword_embedded_in_longer_description(self):
        """Keyword surrounded by other text is still matched."""
        result = LoanDetector().detect(
            [_tx("MONTHLY DEDUCTION FOR HOUSING LOAN ACCT 12345", amount=2200.0)]
        )
        assert result["count"] == 1

    def test_multilingual_description_with_english_keyword(self):
        """A mixed-language description containing an English loan keyword matches."""
        # Bahasa/Chinese prefix with embedded English banking keyword.
        result = LoanDetector().detect(
            [_tx("PEMBAYARAN LOAN BULANAN", amount=1800.0)]
        )
        assert result["count"] == 1

    def test_empty_description_not_matched(self):
        result = LoanDetector().detect([_tx("", amount=100.0)])
        assert result["count"] == 0

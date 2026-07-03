"""Tests for the report generator and JSON output."""

import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from src.loan_detector import LoanDetector
from src.fraud_detector import FraudDetector
from src.parsers.base_parser import LoanRepayment, SuspiciousCredit, Transaction
from src.reporter import ReportGenerator


def _tx(description="DEPOSIT", amount=1000.0, transaction_type="credit",
        date="04 MAY 2026"):
    """Helper to build a Transaction with sensible defaults."""
    return Transaction(
        date=date,
        description=description,
        amount=amount,
        transaction_type=transaction_type,
        raw_text=f"{date} {description} {amount}",
    )


class TestBankReportTotals:
    """Tests for credit/debit total computation in the bank report."""

    def test_computes_totals_from_transactions(self):
        txs = [
            _tx(amount=100000.0, transaction_type="credit"),
            _tx(amount=50000.0, transaction_type="credit"),
            _tx(amount=120000.0, transaction_type="debit"),
        ]
        report = ReportGenerator().generate_bank_report(
            bank="DBS",
            company_name="ABC Pte Ltd",
            statement_period="01 MAY 2026 - 31 MAY 2026",
            transactions=txs,
            loan_result=None,
            suspicious_credits=None,
        )
        assert report["total_credits"] == 150000.00
        assert report["total_debits"] == 120000.00

    def test_empty_transactions_zero_totals(self):
        report = ReportGenerator().generate_bank_report(
            bank="OCBC",
            company_name=None,
            statement_period=None,
            transactions=[],
            loan_result=None,
            suspicious_credits=None,
        )
        assert report["total_credits"] == 0.0
        assert report["total_debits"] == 0.0

    def test_case_insensitive_transaction_type(self):
        txs = [
            _tx(amount=200.0, transaction_type="CREDIT"),
            _tx(amount=75.0, transaction_type="Debit"),
        ]
        report = ReportGenerator().generate_bank_report(
            bank="UOB", company_name="X", statement_period="p",
            transactions=txs, loan_result=None, suspicious_credits=None,
        )
        assert report["total_credits"] == 200.00
        assert report["total_debits"] == 75.00


class TestBankReportStructure:
    """Tests for the overall bank report schema/structure."""

    def test_report_has_expected_top_level_keys(self):
        report = ReportGenerator().generate_bank_report(
            bank="DBS", company_name="ABC", statement_period="p",
            transactions=[], loan_result=None, suspicious_credits=None,
        )
        assert report["document_type"] == "bank_statement"
        for key in (
            "bank", "company_name", "statement_period", "total_credits",
            "total_debits", "loan_repayments", "suspicious_credits", "warnings",
        ):
            assert key in report

    def test_loan_section_built_from_detector(self):
        txs = [_tx("TERM LOAN REPAYMENT", amount=8200.00, transaction_type="debit")]
        loan_result = LoanDetector().detect(txs)
        report = ReportGenerator().generate_bank_report(
            bank="DBS", company_name="ABC", statement_period="p",
            transactions=txs, loan_result=loan_result, suspicious_credits=None,
        )
        section = report["loan_repayments"]
        assert section["count"] == 1
        assert section["total_amount"] == 8200.00
        assert section["transactions"][0]["loan_type"] == "term loan"
        assert section["transactions"][0]["amount"] == 8200.00

    def test_suspicious_section_built_from_fraud_results(self):
        suspicious = [
            SuspiciousCredit(
                transaction=_tx(amount=50000.0, transaction_type="credit"),
                risk_score=0.8,
                reason="Round number transfer near statement end",
            )
        ]
        report = ReportGenerator().generate_bank_report(
            bank="DBS", company_name="ABC", statement_period="p",
            transactions=[], loan_result=None, suspicious_credits=suspicious,
        )
        section = report["suspicious_credits"]
        assert section["count"] == 1
        entry = section["transactions"][0]
        assert entry["amount"] == 50000.00
        assert entry["risk_score"] == 0.8
        assert entry["reason"] == "Round number transfer near statement end"

    def test_default_warnings_is_empty_list(self):
        report = ReportGenerator().generate_bank_report(
            bank="DBS", company_name="ABC", statement_period="p",
            transactions=[], loan_result=None, suspicious_credits=None,
        )
        assert report["warnings"] == []

    def test_warnings_included(self):
        report = ReportGenerator().generate_bank_report(
            bank="DBS", company_name="ABC", statement_period="p",
            transactions=[], loan_result=None, suspicious_credits=None,
            warnings=["OCR confidence low on page 2"],
        )
        assert report["warnings"] == ["OCR confidence low on page 2"]

    def test_empty_loan_section_defaults(self):
        report = ReportGenerator().generate_bank_report(
            bank="DBS", company_name="ABC", statement_period="p",
            transactions=[], loan_result=None, suspicious_credits=None,
        )
        assert report["loan_repayments"] == {
            "count": 0, "total_amount": 0.0, "transactions": []
        }
        assert report["suspicious_credits"] == {"count": 0, "transactions": []}


class TestIrasReport:
    """Tests for the IRAS NOA report."""

    def test_iras_report_structure(self):
        report = ReportGenerator().generate_iras_report(
            individual_name="John Tan",
            year_of_assessment="2024",
            total_income=120000.0,
        )
        assert report == {
            "document_type": "iras_noa",
            "individual_name": "John Tan",
            "year_of_assessment": "2024",
            "total_income": 120000.00,
            "warnings": [],
        }

    def test_iras_total_income_none_becomes_zero(self):
        report = ReportGenerator().generate_iras_report(
            individual_name=None, year_of_assessment=None, total_income=None,
        )
        assert report["total_income"] == 0.0

    def test_iras_warnings_included(self):
        report = ReportGenerator().generate_iras_report(
            individual_name="A", year_of_assessment="2024", total_income=1.0,
            warnings=["name uncertain"],
        )
        assert report["warnings"] == ["name uncertain"]


class TestMonetaryFormatting:
    """Tests that monetary amounts are rounded to two decimal places."""

    def test_amounts_rounded_to_two_decimals(self):
        txs = [
            _tx(amount=100.005, transaction_type="credit"),
            _tx(amount=50.999, transaction_type="debit"),
        ]
        report = ReportGenerator().generate_bank_report(
            bank="DBS", company_name="ABC", statement_period="p",
            transactions=txs, loan_result=None, suspicious_credits=None,
        )
        # 100.005 -> 100.0 (banker's rounding) or 100.01; ensure 2-dp precision
        assert round(report["total_credits"], 2) == report["total_credits"]
        assert report["total_debits"] == 51.00

    def test_loan_transaction_amount_rounded(self):
        rep = LoanRepayment(
            transaction=_tx("LOAN", amount=1234.5678, transaction_type="debit"),
            loan_type="loan",
        )
        loan_result = {"count": 1, "total_amount": 1234.5678, "repayments": [rep]}
        report = ReportGenerator().generate_bank_report(
            bank="DBS", company_name="ABC", statement_period="p",
            transactions=[], loan_result=loan_result, suspicious_credits=None,
        )
        assert report["loan_repayments"]["total_amount"] == 1234.57
        assert report["loan_repayments"]["transactions"][0]["amount"] == 1234.57


class TestToJson:
    """Tests for the JSON serialization helper."""

    def test_to_json_produces_valid_indented_json(self):
        report = ReportGenerator().generate_iras_report(
            individual_name="John Tan", year_of_assessment="2024",
            total_income=120000.0,
        )
        out = ReportGenerator().to_json(report)
        assert isinstance(out, str)
        assert "\n  " in out  # indent=2 produces two-space indentation
        assert json.loads(out) == report

    def test_to_json_bank_report_roundtrip(self):
        txs = [_tx(amount=100.0, transaction_type="credit")]
        report = ReportGenerator().generate_bank_report(
            bank="DBS", company_name="ABC", statement_period="p",
            transactions=txs, loan_result=None, suspicious_credits=None,
        )
        assert json.loads(ReportGenerator().to_json(report)) == report


class TestEndToEndIntegration:
    """Integration test combining loan + fraud detectors into a report."""

    def test_full_bank_report_from_detectors(self):
        txs = [
            _tx("SALES DEPOSIT", amount=4000.0, transaction_type="credit",
                date="03 MAY 2026"),
            _tx("CAPITAL INJECTION", amount=50000.0, transaction_type="credit",
                date="30 MAY 2026"),
            _tx("TERM LOAN REPAYMENT", amount=8200.0, transaction_type="debit",
                date="10 MAY 2026"),
        ]
        loan_result = LoanDetector().detect(txs)
        suspicious = FraudDetector().analyze(
            txs, statement_period="01 MAY 2026 - 31 MAY 2026"
        )
        report = ReportGenerator().generate_bank_report(
            bank="DBS",
            company_name="ABC Pte Ltd",
            statement_period="01 MAY 2026 - 31 MAY 2026",
            transactions=txs,
            loan_result=loan_result,
            suspicious_credits=suspicious,
        )
        assert report["total_credits"] == 54000.00
        assert report["total_debits"] == 8200.00
        assert report["loan_repayments"]["count"] == 1
        assert report["suspicious_credits"]["count"] >= 1
        # report must be JSON serializable
        json.loads(ReportGenerator().to_json(report))

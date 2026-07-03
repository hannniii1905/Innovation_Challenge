"""Tests for the credit-kiting detector and sales recommendations.

Validates: Requirements 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.8
"""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from src.credit_kiting import CreditKitingDetector, CreditKitingFinding
from src.parsers.base_parser import Transaction
from src.reporter import ReportGenerator


def _tx(amount, transaction_type="credit", date="04 MAY 2026",
        description="TRANSFER"):
    """Helper to build a Transaction with sensible defaults."""
    return Transaction(
        date=date,
        description=description,
        amount=amount,
        transaction_type=transaction_type,
        raw_text=f"{date} {description} {amount}",
    )


PERIOD = "01 MAY 2026 - 31 MAY 2026"


class TestCircularFundMovement:
    """circular_fund_movement pattern (Requirement 10.2)."""

    def test_flags_credit_followed_by_similar_debit(self):
        txs = [
            _tx(20000.0, "credit", "05 MAY 2026", "INWARD TRANSFER"),
            _tx(20000.0, "debit", "09 MAY 2026", "OUTWARD TRANSFER"),
        ]
        findings = CreditKitingDetector().detect(txs, statement_period=PERIOD)
        circular = [f for f in findings if f.pattern == "circular_fund_movement"]
        assert len(circular) == 1
        assert circular[0].related_transactions[0].amount == 20000.0
        assert circular[0].related_transactions[1].transaction_type == "debit"

    def test_flags_similar_but_not_exact_amount_within_tolerance(self):
        txs = [
            _tx(20000.0, "credit", "05 MAY 2026"),
            _tx(19500.0, "debit", "07 MAY 2026"),  # within 5% tolerance
        ]
        findings = CreditKitingDetector().detect(txs, statement_period=PERIOD)
        assert any(f.pattern == "circular_fund_movement" for f in findings)

    def test_does_not_flag_debit_outside_window(self):
        txs = [
            _tx(20000.0, "credit", "01 MAY 2026"),
            _tx(20000.0, "debit", "20 MAY 2026"),  # 19 days later
        ]
        findings = CreditKitingDetector().detect(txs, statement_period=PERIOD)
        assert all(
            f.pattern != "circular_fund_movement" for f in findings
        )

    def test_does_not_flag_debit_before_credit(self):
        txs = [
            _tx(20000.0, "debit", "01 MAY 2026"),
            _tx(20000.0, "credit", "05 MAY 2026"),
        ]
        findings = CreditKitingDetector().detect(txs, statement_period=PERIOD)
        assert all(
            f.pattern != "circular_fund_movement" for f in findings
        )

    def test_does_not_flag_dissimilar_amounts(self):
        txs = [
            _tx(20000.0, "credit", "05 MAY 2026"),
            _tx(5000.0, "debit", "07 MAY 2026"),
        ]
        findings = CreditKitingDetector().detect(txs, statement_period=PERIOD)
        assert all(
            f.pattern != "circular_fund_movement" for f in findings
        )


class TestRelatedPartyInjection:
    """related_party_injection pattern (Requirement 10.3)."""

    def test_flags_large_capital_injection(self):
        # Realistic 350,000 capital injection from Maybank/UOB samples.
        txs = [
            _tx(3000.0, "credit", "02 MAY 2026", "SALES DEPOSIT"),
            _tx(4500.0, "credit", "06 MAY 2026", "SALES DEPOSIT"),
            _tx(3200.0, "credit", "10 MAY 2026", "CUSTOMER PAYMENT"),
            _tx(350000.0, "credit", "15 MAY 2026", "CAPITAL INJECTION"),
        ]
        findings = CreditKitingDetector().detect(txs, statement_period=PERIOD)
        injections = [
            f for f in findings if f.pattern == "related_party_injection"
        ]
        assert len(injections) == 1
        assert injections[0].related_transactions[0].amount == 350000.0
        assert injections[0].risk_level == "high"

    def test_flags_directors_advance_keyword(self):
        txs = [
            _tx(2000.0, "credit", "02 MAY 2026", "SALES"),
            _tx(2500.0, "credit", "06 MAY 2026", "SALES"),
            _tx(80000.0, "credit", "15 MAY 2026", "DIRECTOR'S ADVANCE"),
        ]
        findings = CreditKitingDetector().detect(txs, statement_period=PERIOD)
        assert any(
            f.pattern == "related_party_injection" for f in findings
        )

    def test_flags_shareholder_loan_keyword(self):
        txs = [
            _tx(2000.0, "credit", "02 MAY 2026", "SALES"),
            _tx(2500.0, "credit", "06 MAY 2026", "SALES"),
            _tx(90000.0, "credit", "15 MAY 2026", "SHAREHOLDER LOAN"),
        ]
        findings = CreditKitingDetector().detect(txs, statement_period=PERIOD)
        assert any(
            f.pattern == "related_party_injection" for f in findings
        )

    def test_does_not_flag_small_injection(self):
        # A keyword match that does NOT greatly exceed the median.
        txs = [
            _tx(3000.0, "credit", "02 MAY 2026", "SALES"),
            _tx(3000.0, "credit", "06 MAY 2026", "SALES"),
            _tx(3500.0, "credit", "10 MAY 2026", "DIRECTOR'S ADVANCE"),
        ]
        findings = CreditKitingDetector().detect(txs, statement_period=PERIOD)
        assert all(
            f.pattern != "related_party_injection" for f in findings
        )

    def test_does_not_flag_large_credit_without_keyword(self):
        txs = [
            _tx(3000.0, "credit", "02 MAY 2026", "SALES"),
            _tx(3000.0, "credit", "06 MAY 2026", "SALES"),
            _tx(100000.0, "credit", "10 MAY 2026", "CUSTOMER SETTLEMENT"),
        ]
        findings = CreditKitingDetector().detect(txs, statement_period=PERIOD)
        assert all(
            f.pattern != "related_party_injection" for f in findings
        )


class TestTemporaryDeposit:
    """temporary_deposit pattern (Requirement 10.4)."""

    def test_flags_deposit_near_end_withdrawn_after(self):
        txs = [
            _tx(50000.0, "credit", "29 MAY 2026", "INWARD TRANSFER"),
            _tx(50000.0, "debit", "02 JUN 2026", "OUTWARD TRANSFER"),
        ]
        findings = CreditKitingDetector().detect(txs, statement_period=PERIOD)
        temp = [f for f in findings if f.pattern == "temporary_deposit"]
        assert len(temp) == 1
        assert temp[0].related_transactions[0].amount == 50000.0

    def test_does_not_flag_without_statement_period(self):
        txs = [
            _tx(50000.0, "credit", "29 MAY 2026"),
            _tx(50000.0, "debit", "02 JUN 2026"),
        ]
        findings = CreditKitingDetector().detect(txs, statement_period=None)
        assert all(f.pattern != "temporary_deposit" for f in findings)

    def test_does_not_flag_deposit_early_in_period(self):
        txs = [
            _tx(50000.0, "credit", "05 MAY 2026"),
            _tx(50000.0, "debit", "08 MAY 2026"),
        ]
        findings = CreditKitingDetector().detect(txs, statement_period=PERIOD)
        assert all(f.pattern != "temporary_deposit" for f in findings)

    def test_does_not_flag_deposit_not_withdrawn(self):
        txs = [
            _tx(50000.0, "credit", "29 MAY 2026"),
        ]
        findings = CreditKitingDetector().detect(txs, statement_period=PERIOD)
        assert all(f.pattern != "temporary_deposit" for f in findings)


class TestRiskLevelAssignment:
    """risk_level derivation (Requirement 10.5)."""

    def test_exact_circular_match_is_high(self):
        txs = [
            _tx(20000.0, "credit", "05 MAY 2026"),
            _tx(20000.0, "debit", "08 MAY 2026"),
        ]
        findings = CreditKitingDetector().detect(txs, statement_period=PERIOD)
        circular = [f for f in findings if f.pattern == "circular_fund_movement"]
        assert circular[0].risk_level == "high"

    def test_risk_level_is_valid_value(self):
        txs = [
            _tx(20000.0, "credit", "05 MAY 2026"),
            _tx(20000.0, "debit", "08 MAY 2026"),
            _tx(350000.0, "credit", "15 MAY 2026", "CAPITAL INJECTION"),
        ]
        findings = CreditKitingDetector().detect(txs, statement_period=PERIOD)
        assert findings
        for f in findings:
            assert f.risk_level in ("low", "medium", "high")

    def test_findings_ordered_high_to_low(self):
        txs = [
            # related-party small-ish -> still high due to 350k
            _tx(2000.0, "credit", "02 MAY 2026", "SALES"),
            _tx(2000.0, "credit", "06 MAY 2026", "SALES"),
            _tx(350000.0, "credit", "15 MAY 2026", "CAPITAL INJECTION"),
            _tx(20000.0, "credit", "20 MAY 2026"),
            _tx(20000.0, "debit", "22 MAY 2026"),
        ]
        findings = CreditKitingDetector().detect(txs, statement_period=PERIOD)
        order = {"high": 0, "medium": 1, "low": 2}
        levels = [order[f.risk_level] for f in findings]
        assert levels == sorted(levels)


class TestSalesRecommendation:
    """Sales_Recommendation content and evidence references (Req 10.6, 10.8)."""

    def test_finding_has_explanation_and_suggested_action(self):
        txs = [
            _tx(2000.0, "credit", "02 MAY 2026", "SALES"),
            _tx(2000.0, "credit", "06 MAY 2026", "SALES"),
            _tx(350000.0, "credit", "15 MAY 2026", "CAPITAL INJECTION"),
        ]
        findings = CreditKitingDetector().detect(txs, statement_period=PERIOD)
        finding = findings[0]
        assert finding.explanation
        assert finding.suggested_action
        # References the triggering transaction (evidence trail).
        assert finding.related_transactions

    def test_returns_credit_kiting_finding_objects(self):
        txs = [
            _tx(20000.0, "credit", "05 MAY 2026"),
            _tx(20000.0, "debit", "08 MAY 2026"),
        ]
        findings = CreditKitingDetector().detect(txs, statement_period=PERIOD)
        assert all(isinstance(f, CreditKitingFinding) for f in findings)


class TestEdgeCases:
    """Graceful handling of empty/None input."""

    def test_empty_list(self):
        assert CreditKitingDetector().detect([]) == []

    def test_none_list(self):
        assert CreditKitingDetector().detect(None) == []

    def test_no_patterns_returns_empty(self):
        txs = [
            _tx(1000.0, "credit", "02 MAY 2026", "SALES"),
            _tx(1200.0, "credit", "10 MAY 2026", "SALES"),
        ]
        assert CreditKitingDetector().detect(txs, statement_period=PERIOD) == []


class TestReporterIntegration:
    """credit_kiting section in the bank report (Requirement 10.7)."""

    def test_report_includes_empty_credit_kiting_section_by_default(self):
        report = ReportGenerator().generate_bank_report(
            bank="DBS", company_name="ABC", statement_period=PERIOD,
            transactions=[], loan_result=None, suspicious_credits=None,
        )
        assert report["credit_kiting"] == {"count": 0, "findings": []}

    def test_report_includes_credit_kiting_findings(self):
        txs = [
            _tx(2000.0, "credit", "02 MAY 2026", "SALES"),
            _tx(2000.0, "credit", "06 MAY 2026", "SALES"),
            _tx(350000.0, "credit", "15 MAY 2026", "CAPITAL INJECTION"),
        ]
        findings = CreditKitingDetector().detect(txs, statement_period=PERIOD)
        report = ReportGenerator().generate_bank_report(
            bank="MAYBANK", company_name="ABC", statement_period=PERIOD,
            transactions=txs, loan_result=None, suspicious_credits=None,
            credit_kiting=findings,
        )
        section = report["credit_kiting"]
        assert section["count"] == 1
        entry = section["findings"][0]
        assert entry["pattern"] == "related_party_injection"
        assert entry["risk_level"] == "high"
        assert entry["explanation"]
        assert entry["suggested_action"]
        assert entry["related_transactions"][0]["amount"] == 350000.00

    def test_report_orders_findings_by_risk_level(self):
        txs = [
            _tx(2000.0, "credit", "02 MAY 2026", "SALES"),
            _tx(2000.0, "credit", "06 MAY 2026", "SALES"),
            _tx(350000.0, "credit", "15 MAY 2026", "CAPITAL INJECTION"),
            _tx(20000.0, "credit", "20 MAY 2026"),
            _tx(20000.0, "debit", "22 MAY 2026"),
        ]
        findings = CreditKitingDetector().detect(txs, statement_period=PERIOD)
        report = ReportGenerator().generate_bank_report(
            bank="UOB", company_name="ABC", statement_period=PERIOD,
            transactions=txs, loan_result=None, suspicious_credits=None,
            credit_kiting=findings,
        )
        order = {"high": 0, "medium": 1, "low": 2}
        levels = [
            order[f["risk_level"]] for f in report["credit_kiting"]["findings"]
        ]
        assert levels == sorted(levels)

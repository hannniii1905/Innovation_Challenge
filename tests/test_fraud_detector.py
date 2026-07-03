"""Tests for the suspicious credit fraud detector.

Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
"""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from src.fraud_detector import FraudDetector
from src.parsers.base_parser import SuspiciousCredit, Transaction


def _tx(amount, transaction_type="credit", date="04 MAY 2026", description="TRANSFER"):
    """Helper to build a Transaction with sensible defaults."""
    return Transaction(
        date=date,
        description=description,
        amount=amount,
        transaction_type=transaction_type,
        raw_text=f"{date} {description} {amount}",
    )


class TestRoundNumberDetection:
    """Round-number heuristic (Requirement 6.2)."""

    def test_flags_round_number_above_threshold(self):
        result = FraudDetector().analyze([_tx(10000.0)])
        assert len(result) == 1
        assert "Round-number" in result[0].reason

    def test_does_not_flag_round_number_below_threshold(self):
        # 2000 is round but below the default 5000 threshold and not large
        # relative to itself; with a single credit nothing else triggers.
        result = FraudDetector().analyze([_tx(2000.0)])
        assert result == []

    def test_does_not_flag_non_round_number(self):
        result = FraudDetector().analyze([_tx(7345.67)])
        assert result == []

    def test_threshold_boundary_is_inclusive(self):
        result = FraudDetector().analyze([_tx(5000.0)])
        assert len(result) == 1

    def test_custom_threshold(self):
        detector = FraudDetector(round_number_threshold=20000.0)
        # 10000 round but below custom threshold -> not flagged by round rule.
        assert detector.analyze([_tx(10000.0)]) == []
        assert len(detector.analyze([_tx(20000.0)])) == 1


class TestCircularTransactionDetection:
    """Circular transaction heuristic (Requirement 6.3)."""

    def test_flags_credit_with_matching_debit_within_window(self):
        txs = [
            _tx(8000.0, transaction_type="credit", date="04 MAY 2026"),
            _tx(8000.0, transaction_type="debit", date="08 MAY 2026"),
        ]
        result = FraudDetector().analyze(txs)
        flagged = [sc for sc in result if "circular" in sc.reason.lower()]
        assert len(flagged) == 1

    def test_does_not_flag_when_debit_outside_window(self):
        txs = [
            _tx(8000.0, transaction_type="credit", date="01 MAY 2026"),
            _tx(8000.0, transaction_type="debit", date="20 MAY 2026"),
        ]
        result = FraudDetector().analyze(txs)
        # 8000 is round and >= threshold so still flagged, but NOT for circular.
        assert all("circular" not in sc.reason.lower() for sc in result)

    def test_no_circular_when_amounts_differ(self):
        txs = [
            _tx(8000.0, transaction_type="credit", date="04 MAY 2026"),
            _tx(7999.0, transaction_type="debit", date="05 MAY 2026"),
        ]
        result = FraudDetector().analyze(txs)
        assert all("circular" not in sc.reason.lower() for sc in result)

    def test_custom_circular_window(self):
        txs = [
            _tx(3333.0, transaction_type="credit", date="01 MAY 2026"),
            _tx(3333.0, transaction_type="debit", date="10 MAY 2026"),
        ]
        detector = FraudDetector(circular_window_days=14)
        result = detector.analyze(txs)
        assert any("circular" in sc.reason.lower() for sc in result)


class TestTimingAnalysis:
    """Timing heuristic (Requirement 6.2 - near statement end)."""

    def test_flags_large_credit_near_period_end(self):
        txs = [
            _tx(1000.0, date="03 MAY 2026"),
            _tx(1000.0, date="10 MAY 2026"),
            _tx(1000.0, date="15 MAY 2026"),
            _tx(9999.0, date="30 MAY 2026"),  # large + near end (non-round)
        ]
        result = FraudDetector().analyze(txs, statement_period="01 MAY 2026 - 31 MAY 2026")
        flagged = [sc for sc in result if "last" in sc.reason.lower()]
        assert len(flagged) == 1
        assert flagged[0].transaction.amount == 9999.0

    def test_does_not_flag_when_no_statement_period(self):
        txs = [
            _tx(1000.0, date="03 MAY 2026"),
            _tx(9999.0, date="30 MAY 2026"),
        ]
        result = FraudDetector().analyze(txs)
        assert all("last" not in sc.reason.lower() for sc in result)

    def test_does_not_flag_credit_early_in_period(self):
        txs = [
            _tx(1000.0, date="03 MAY 2026"),
            _tx(1000.0, date="10 MAY 2026"),
            _tx(9999.0, date="05 MAY 2026"),
        ]
        result = FraudDetector().analyze(txs, statement_period="01 MAY 2026 - 31 MAY 2026")
        assert all("last" not in sc.reason.lower() for sc in result)

    def test_handles_to_separator_in_period(self):
        txs = [
            _tx(1000.0, date="03 MAY 2026"),
            _tx(1000.0, date="10 MAY 2026"),
            _tx(8500.0, date="29 MAY 2026"),
        ]
        result = FraudDetector().analyze(txs, statement_period="01 MAY 2026 TO 31 MAY 2026")
        assert any("last" in sc.reason.lower() for sc in result)


class TestFrequencyAnomaly:
    """Frequency/amount anomaly heuristic (Requirement 6.4)."""

    def test_flags_amount_spike(self):
        txs = [
            _tx(1000.0, date="01 MAY 2026"),
            _tx(1000.0, date="05 MAY 2026"),
            _tx(1000.0, date="10 MAY 2026"),
            _tx(4500.0, date="12 MAY 2026"),  # >3x median of 1000, non-round
        ]
        result = FraudDetector().analyze(txs)
        flagged = [sc for sc in result if "anomalous spike" in sc.reason.lower()]
        assert len(flagged) == 1
        assert flagged[0].transaction.amount == 4500.0

    def test_no_spike_when_amounts_uniform(self):
        txs = [_tx(1000.0, date=f"0{i} MAY 2026") for i in range(1, 6)]
        result = FraudDetector().analyze(txs)
        assert result == []


class TestRiskScoring:
    """Risk score scaling with number of triggered heuristics (Req 6.5)."""

    def test_single_heuristic_low_score(self):
        result = FraudDetector().analyze([_tx(10000.0)])
        assert len(result) == 1
        assert result[0].risk_score == 0.3

    def test_multiple_heuristics_higher_score(self):
        # Round (10000 >= 5000) + circular + timing + frequency spike.
        txs = [
            _tx(1000.0, date="02 MAY 2026"),
            _tx(1000.0, date="05 MAY 2026"),
            _tx(1000.0, date="08 MAY 2026"),
            _tx(10000.0, transaction_type="credit", date="29 MAY 2026"),
            _tx(10000.0, transaction_type="debit", date="30 MAY 2026"),
        ]
        result = FraudDetector().analyze(txs, statement_period="01 MAY 2026 - 31 MAY 2026")
        top = result[0]
        assert top.transaction.amount == 10000.0
        # All four heuristics should trigger -> score 1.0
        assert top.risk_score == 1.0

    def test_score_within_bounds(self):
        txs = [_tx(10000.0, date="30 MAY 2026")]
        result = FraudDetector().analyze(txs, statement_period="01 MAY 2026 - 31 MAY 2026")
        for sc in result:
            assert 0.0 <= sc.risk_score <= 1.0

    def test_results_sorted_by_risk_descending(self):
        txs = [
            _tx(1000.0, date="02 MAY 2026"),
            _tx(1000.0, date="05 MAY 2026"),
            _tx(6000.0, date="10 MAY 2026"),  # round only -> 0.3
            _tx(10000.0, transaction_type="credit", date="29 MAY 2026"),
            _tx(10000.0, transaction_type="debit", date="30 MAY 2026"),  # multi
        ]
        result = FraudDetector().analyze(txs, statement_period="01 MAY 2026 - 31 MAY 2026")
        scores = [sc.risk_score for sc in result]
        assert scores == sorted(scores, reverse=True)


class TestReturnShapeAndReasons:
    """Output structure and reason descriptions (Requirement 6.6)."""

    def test_returns_suspicious_credit_objects(self):
        result = FraudDetector().analyze([_tx(10000.0)])
        assert all(isinstance(sc, SuspiciousCredit) for sc in result)
        assert result[0].reason  # non-empty reason

    def test_only_credits_are_flagged(self):
        txs = [
            _tx(10000.0, transaction_type="debit", date="04 MAY 2026"),
        ]
        result = FraudDetector().analyze(txs)
        assert result == []

    def test_reason_combines_multiple_heuristics(self):
        txs = [
            _tx(10000.0, transaction_type="credit", date="04 MAY 2026"),
            _tx(10000.0, transaction_type="debit", date="06 MAY 2026"),
        ]
        result = FraudDetector().analyze(txs)
        # Round-number + circular reasons joined.
        assert ";" in result[0].reason


class TestEdgeCases:
    """Graceful handling of empty/None/unparseable input."""

    def test_empty_list(self):
        assert FraudDetector().analyze([]) == []

    def test_none_list(self):
        assert FraudDetector().analyze(None) == []

    def test_unparseable_dates_do_not_crash(self):
        txs = [
            _tx(10000.0, transaction_type="credit", date="N/A"),
            _tx(10000.0, transaction_type="debit", date="unknown"),
        ]
        # Should still flag round-number; circular falls back to amount match.
        result = FraudDetector().analyze(txs, statement_period="garbage")
        assert len(result) == 1
        assert result[0].risk_score >= 0.3

    def test_negative_amount_not_round_flagged(self):
        result = FraudDetector().analyze([_tx(-10000.0)])
        assert result == []

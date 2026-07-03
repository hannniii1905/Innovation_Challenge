"""Fraud detection for suspicious credit transactions.

Analyzes credit transactions to identify patterns consistent with intentional
income inflation ahead of a loan application. Four rule-based heuristics are
applied and combined into a single risk score per flagged credit:

    1. Round-number detection  - exact round-number credits above a threshold.
    2. Circular transaction     - a credit matched by a debit of the same amount
                                  within a short window (default 7 days).
    3. Timing analysis          - large credits in the final days of the
                                  statement period (default last 5 days).
    4. Frequency anomaly        - sudden spikes in credit frequency or amount
                                  relative to the account's typical pattern.

Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
"""

import re
from datetime import datetime, timedelta
from typing import List, Optional, Tuple

from src.parsers.base_parser import SuspiciousCredit, Transaction


class FraudDetector:
    """Detects suspicious credit transactions using rule-based heuristics.

    Each credit transaction is evaluated against four independent heuristics.
    Credits that trigger one or more heuristics are returned as
    ``SuspiciousCredit`` objects with a combined risk score (0.0-1.0) and a
    human-readable reason that aggregates every triggered heuristic.

    Args:
        round_number_threshold: Minimum amount for a round-number credit to be
            flagged. Defaults to 5000.
        circular_window_days: Day window for matching a credit to an offsetting
            debit of the same amount. Defaults to 7.
        timing_window_days: Number of days at the end of the statement period
            considered "near the end". Defaults to 5.
        large_credit_multiplier: A credit is "large" (for timing/frequency
            heuristics) when it exceeds this multiple of the median credit
            amount. Defaults to 2.0.
        frequency_spike_multiplier: A credit amount is an anomalous spike when
            it exceeds this multiple of the median credit amount. Defaults to
            3.0.
    """

    # Month abbreviation/name -> month number, for parsing "DD MMM YYYY" dates.
    _MONTHS = {
        "jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
        "jul": 7, "aug": 8, "sep": 9, "sept": 9, "oct": 10, "nov": 11, "dec": 12,
        "january": 1, "february": 2, "march": 3, "april": 4, "june": 6,
        "july": 7, "august": 8, "september": 9, "october": 10,
        "november": 11, "december": 12,
    }

    _DATE_RE = re.compile(r"(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})")

    def __init__(
        self,
        round_number_threshold: float = 5000.0,
        circular_window_days: int = 7,
        timing_window_days: int = 5,
        large_credit_multiplier: float = 2.0,
        frequency_spike_multiplier: float = 3.0,
    ) -> None:
        self.round_number_threshold = round_number_threshold
        self.circular_window_days = circular_window_days
        self.timing_window_days = timing_window_days
        self.large_credit_multiplier = large_credit_multiplier
        self.frequency_spike_multiplier = frequency_spike_multiplier

    # ------------------------------------------------------------------ #
    # Date parsing helpers
    # ------------------------------------------------------------------ #
    def _parse_date(self, date_str: Optional[str]) -> Optional[datetime]:
        """Parse a "DD MMM YYYY" date string into a datetime.

        Returns None if the string is missing or cannot be parsed, so callers
        can degrade gracefully rather than raising.
        """
        if not date_str:
            return None

        match = self._DATE_RE.search(date_str)
        if not match:
            return None

        day_s, month_s, year_s = match.groups()
        month = self._MONTHS.get(month_s.lower())
        if month is None:
            return None

        try:
            return datetime(int(year_s), month, int(day_s))
        except ValueError:
            return None

    def _parse_statement_period_end(
        self, statement_period: Optional[str]
    ) -> Optional[datetime]:
        """Extract the end date from a statement period string.

        Handles formats such as:
            "01 MAY 2026 - 31 MAY 2026"
            "01 MAY 2026 TO 31 MAY 2026"

        Returns the later of the two parsed dates, or None if it cannot be
        determined.
        """
        if not statement_period:
            return None

        dates = [
            self._parse_date(f"{d} {m} {y}")
            for d, m, y in self._DATE_RE.findall(statement_period)
        ]
        dates = [d for d in dates if d is not None]
        if not dates:
            return None
        return max(dates)

    # ------------------------------------------------------------------ #
    # Heuristics
    # ------------------------------------------------------------------ #
    @staticmethod
    def _is_round_number(amount: float) -> bool:
        """Return True if the amount is an exact multiple of 1000.

        Round-number transfers (e.g., 5000, 10000, 50000) are a common marker
        of deliberate injections rather than organic business revenue, which
        usually carries odd cents/values.
        """
        if amount <= 0:
            return False
        return abs(amount) % 1000 == 0

    def _check_round_number(self, credit: Transaction) -> Optional[str]:
        """Round-number heuristic: exact thousands at/above the threshold."""
        if (
            self._is_round_number(credit.amount)
            and credit.amount >= self.round_number_threshold
        ):
            return (
                f"Round-number credit of {credit.amount:,.2f} at or above "
                f"threshold {self.round_number_threshold:,.0f}"
            )
        return None

    def _check_circular(
        self, credit: Transaction, debits: List[Transaction]
    ) -> Optional[str]:
        """Circular heuristic: an offsetting debit of the same amount nearby.

        A matching debit of the same amount within ``circular_window_days``
        (in either direction) suggests the funds were cycled out shortly after
        being deposited.
        """
        credit_date = self._parse_date(credit.date)
        window = timedelta(days=self.circular_window_days)

        for debit in debits:
            if abs(debit.amount - credit.amount) > 0.005:
                continue

            debit_date = self._parse_date(debit.date)
            # If either date is unparseable, fall back to amount-only matching.
            if credit_date is None or debit_date is None:
                return (
                    f"Matching debit of {credit.amount:,.2f} found "
                    f"(circular transaction pattern)"
                )
            if abs((debit_date - credit_date).days) <= self.circular_window_days:
                return (
                    f"Matching debit of {credit.amount:,.2f} within "
                    f"{self.circular_window_days} days (circular transaction)"
                )
        return None

    def _check_timing(
        self,
        credit: Transaction,
        period_end: Optional[datetime],
        median_credit: float,
    ) -> Optional[str]:
        """Timing heuristic: large credit in the final days of the period."""
        if period_end is None:
            return None

        credit_date = self._parse_date(credit.date)
        if credit_date is None:
            return None

        days_before_end = (period_end - credit_date).days
        if not (0 <= days_before_end <= self.timing_window_days):
            return None

        # Only flag if the credit is "large" relative to typical credits.
        is_large = (
            median_credit <= 0
            or credit.amount >= median_credit * self.large_credit_multiplier
        )
        if is_large:
            return (
                f"Large credit of {credit.amount:,.2f} occurring within the "
                f"last {self.timing_window_days} days of the statement period"
            )
        return None

    def _check_frequency_anomaly(
        self, credit: Transaction, median_credit: float
    ) -> Optional[str]:
        """Frequency/amount anomaly: a credit far larger than the norm.

        A single credit whose amount dwarfs the median credit indicates an
        atypical spike in inflow magnitude.
        """
        if median_credit <= 0:
            return None
        if credit.amount >= median_credit * self.frequency_spike_multiplier:
            return (
                f"Credit amount {credit.amount:,.2f} is more than "
                f"{self.frequency_spike_multiplier:g}x the typical credit "
                f"({median_credit:,.2f}) - anomalous spike"
            )
        return None

    # ------------------------------------------------------------------ #
    # Aggregation
    # ------------------------------------------------------------------ #
    @staticmethod
    def _median(values: List[float]) -> float:
        """Return the median of a list of values (0.0 for an empty list)."""
        if not values:
            return 0.0
        ordered = sorted(values)
        n = len(ordered)
        mid = n // 2
        if n % 2 == 1:
            return ordered[mid]
        return (ordered[mid - 1] + ordered[mid]) / 2.0

    @staticmethod
    def _risk_score(num_triggered: int) -> float:
        """Map the number of triggered heuristics (1-4) to a 0.0-1.0 score.

        One heuristic is a weak signal; all four is near-certain. The score
        rises with each additional independent indicator.
        """
        mapping = {0: 0.0, 1: 0.3, 2: 0.55, 3: 0.8, 4: 1.0}
        return mapping.get(num_triggered, 1.0 if num_triggered > 4 else 0.0)

    def analyze(
        self,
        transactions: List[Transaction],
        statement_period: Optional[str] = None,
    ) -> List[SuspiciousCredit]:
        """Analyze transactions and return flagged suspicious credits.

        Args:
            transactions: All transactions (credits and debits) for the period.
            statement_period: Optional period string (e.g.,
                "01 MAY 2026 - 31 MAY 2026") used by the timing heuristic.

        Returns:
            A list of ``SuspiciousCredit`` objects, one per flagged credit,
            sorted by descending risk score.
        """
        transactions = transactions or []

        credits = [
            t for t in transactions if (t.transaction_type or "").lower() == "credit"
        ]
        debits = [
            t for t in transactions if (t.transaction_type or "").lower() == "debit"
        ]

        median_credit = self._median([c.amount for c in credits])
        period_end = self._parse_statement_period_end(statement_period)

        results: List[SuspiciousCredit] = []

        for credit in credits:
            reasons: List[str] = []

            for reason in (
                self._check_round_number(credit),
                self._check_circular(credit, debits),
                self._check_timing(credit, period_end, median_credit),
                self._check_frequency_anomaly(credit, median_credit),
            ):
                if reason:
                    reasons.append(reason)

            if not reasons:
                continue

            score = self._risk_score(len(reasons))
            results.append(
                SuspiciousCredit(
                    transaction=credit,
                    risk_score=round(score, 2),
                    reason="; ".join(reasons),
                )
            )

        results.sort(key=lambda sc: sc.risk_score, reverse=True)
        return results

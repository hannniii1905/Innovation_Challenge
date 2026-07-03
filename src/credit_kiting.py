"""Credit-kiting detection and sales recommendations.

Analyzes verified transaction data to identify Intentional Corporate Cash
Injections (Credit_Kiting) - patterns where credits are engineered to
artificially inflate apparent revenue or balances ahead of a loan application.

Three kiting-specific indicators are applied:

    1. circular_fund_movement   - a credit followed by a debit of a similar
                                  amount within a short window (default 7 days).
    2. related_party_injection  - a large credit matching related-party /
                                  director keywords ("director's advance",
                                  "capital injection", "shareholder loan", ...)
                                  that greatly exceeds the median transaction
                                  size.
    3. temporary_deposit        - a credit shortly before the statement period
                                  end that is withdrawn shortly after.

Each detected pattern yields a ``CreditKitingFinding`` carrying a risk level
(low/medium/high), an explanation, a sales-oriented suggested action aimed at a
relationship manager / sales officer, and references to the triggering
transactions so the reviewer can trace the evidence.

Validates: Requirements 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.8
"""

import re
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import List, Optional

from src.parsers.base_parser import Transaction


@dataclass
class CreditKitingFinding:
    """A single detected credit-kiting pattern and its sales recommendation.

    Attributes:
        pattern: Pattern identifier, one of "circular_fund_movement",
            "related_party_injection", or "temporary_deposit".
        risk_level: Severity of the finding: "low", "medium", or "high".
        explanation: Human-readable explanation of the detected pattern.
        suggested_action: A Sales_Recommendation next action for the
            relationship manager / sales officer reviewing the application.
        related_transactions: The transactions that triggered this finding.
    """

    pattern: str
    risk_level: str  # "low" | "medium" | "high"
    explanation: str
    suggested_action: str
    related_transactions: List[Transaction] = field(default_factory=list)


class CreditKitingDetector:
    """Detects credit-kiting patterns and produces sales recommendations.

    Each finding aggregates the strength of its triggering indicators into a
    risk level and a tailored sales recommendation.

    Args:
        circular_window_days: Day window for matching a credit to an offsetting
            debit of a similar amount. Defaults to 7.
        amount_tolerance: Relative tolerance (fraction) for treating a credit
            and a debit as "similar" amounts. Defaults to 0.05 (5%).
        injection_multiplier: A related-party credit is "large" when it exceeds
            this multiple of the median transaction size. Defaults to 3.0.
        temporary_deposit_pre_days: A credit is "shortly before" the period end
            when it falls within this many days of the end. Defaults to 5.
        temporary_deposit_post_days: A withdrawal is "shortly after" the credit
            when it occurs within this many days of the credit. Defaults to 10.
    """

    # Keywords indicating a related-party / director / shareholder injection.
    _INJECTION_KEYWORDS = [
        "director's advance",
        "directors advance",
        "director advance",
        "director's loan",
        "directors loan",
        "director loan",
        "capital injection",
        "cap injection",
        "cap inj",
        "capital inj",
        "shareholder loan",
        "shareholder advance",
        "shareholder's loan",
        "shareholders loan",
        "related party",
        "related-party",
    ]

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
        circular_window_days: int = 7,
        amount_tolerance: float = 0.05,
        injection_multiplier: float = 3.0,
        temporary_deposit_pre_days: int = 5,
        temporary_deposit_post_days: int = 10,
    ) -> None:
        self.circular_window_days = circular_window_days
        self.amount_tolerance = amount_tolerance
        self.injection_multiplier = injection_multiplier
        self.temporary_deposit_pre_days = temporary_deposit_pre_days
        self.temporary_deposit_post_days = temporary_deposit_post_days

    # ------------------------------------------------------------------ #
    # Date parsing helpers
    # ------------------------------------------------------------------ #
    def _parse_date(self, date_str: Optional[str]) -> Optional[datetime]:
        """Parse a "DD MMM YYYY" date string into a datetime, or None."""
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
        """Extract the latest (end) date from a statement period string."""
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
    # Amount helpers
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

    def _amounts_similar(self, a: float, b: float) -> bool:
        """Return True if two amounts are within the configured tolerance."""
        if a <= 0 or b <= 0:
            return False
        reference = max(abs(a), abs(b))
        return abs(a - b) <= reference * self.amount_tolerance

    # ------------------------------------------------------------------ #
    # Risk-level mapping
    # ------------------------------------------------------------------ #
    @staticmethod
    def _risk_from_strength(strength: int) -> str:
        """Map an indicator-strength score to a low/medium/high risk level.

        Strength accumulates from the number and confidence of the indicators
        that contributed to a finding. A single weak indicator is "low"; a
        strong indicator or several stacked indicators escalate to
        "medium"/"high".
        """
        if strength >= 3:
            return "high"
        if strength == 2:
            return "medium"
        return "low"

    # ------------------------------------------------------------------ #
    # Pattern detectors
    # ------------------------------------------------------------------ #
    def _detect_circular(
        self, credits: List[Transaction], debits: List[Transaction]
    ) -> List[CreditKitingFinding]:
        """circular_fund_movement: credit then a similar debit within window."""
        findings: List[CreditKitingFinding] = []
        window = self.circular_window_days

        for credit in credits:
            credit_date = self._parse_date(credit.date)
            for debit in debits:
                if not self._amounts_similar(credit.amount, debit.amount):
                    continue

                debit_date = self._parse_date(debit.date)
                within_window = False
                same_amount = abs(credit.amount - debit.amount) <= 0.005

                if credit_date is None or debit_date is None:
                    # Fall back to amount-only matching (lower confidence).
                    days_gap = None
                else:
                    days_gap = (debit_date - credit_date).days
                    # The debit must occur on/after the credit, within window.
                    if not (0 <= days_gap <= window):
                        continue
                    within_window = True

                # Strength: amount-and-window match is a strong signal;
                # an exact amount makes it stronger.
                strength = 1
                if within_window:
                    strength += 1
                if same_amount:
                    strength += 1

                gap_text = (
                    f"{days_gap} day(s)" if days_gap is not None
                    else "a short window"
                )
                explanation = (
                    f"Circular fund movement: a credit of {credit.amount:,.2f} "
                    f"on {credit.date} was followed by a debit of "
                    f"{debit.amount:,.2f} on {debit.date} ({gap_text} later). "
                    f"Funds appear to have been cycled back out shortly after "
                    f"being deposited, inflating apparent turnover."
                )
                suggested_action = (
                    "Exclude this round-tripped amount from assessed turnover "
                    "and request an explanation for the offsetting transfer "
                    "before relying on the inflated cash flow for the facility."
                )
                findings.append(
                    CreditKitingFinding(
                        pattern="circular_fund_movement",
                        risk_level=self._risk_from_strength(strength),
                        explanation=explanation,
                        suggested_action=suggested_action,
                        related_transactions=[credit, debit],
                    )
                )
                # One finding per credit is enough; stop at first match.
                break

        return findings

    def _detect_related_party(
        self, credits: List[Transaction], median_amount: float
    ) -> List[CreditKitingFinding]:
        """related_party_injection: large director/shareholder keyword credit."""
        findings: List[CreditKitingFinding] = []

        for credit in credits:
            description = (credit.description or "").lower()
            matched_keyword = next(
                (kw for kw in self._INJECTION_KEYWORDS if kw in description),
                None,
            )
            if matched_keyword is None:
                continue

            # Determine how greatly it exceeds the typical transaction size.
            is_large = (
                median_amount <= 0
                or credit.amount >= median_amount * self.injection_multiplier
            )
            if not is_large:
                continue

            ratio = (
                credit.amount / median_amount if median_amount > 0 else None
            )
            # Strength: keyword match (1) + large vs median (1); a very large
            # multiple (>= 2x the injection_multiplier) adds another.
            strength = 2
            if ratio is not None and ratio >= self.injection_multiplier * 2:
                strength += 1

            ratio_text = (
                f"{ratio:,.1f}x the median transaction size "
                f"({median_amount:,.2f})"
                if ratio is not None
                else "the typical transaction size"
            )
            explanation = (
                f"Large related-party injection: a credit of "
                f"{credit.amount:,.2f} on {credit.date} described as "
                f"\"{credit.description}\" matches related-party keyword "
                f"\"{matched_keyword}\" and is {ratio_text}. Such injections "
                f"are not recurring operating income."
            )
            suggested_action = (
                "Request source-of-funds documentation and verify whether the "
                "injection is sustainable income before approving the facility; "
                "treat it as owner funding rather than business revenue."
            )
            findings.append(
                CreditKitingFinding(
                    pattern="related_party_injection",
                    risk_level=self._risk_from_strength(strength),
                    explanation=explanation,
                    suggested_action=suggested_action,
                    related_transactions=[credit],
                )
            )

        return findings

    def _detect_temporary_deposit(
        self,
        credits: List[Transaction],
        debits: List[Transaction],
        period_end: Optional[datetime],
    ) -> List[CreditKitingFinding]:
        """temporary_deposit: credit just before period end, withdrawn after."""
        if period_end is None:
            return []

        findings: List[CreditKitingFinding] = []

        for credit in credits:
            credit_date = self._parse_date(credit.date)
            if credit_date is None:
                continue

            days_before_end = (period_end - credit_date).days
            if not (0 <= days_before_end <= self.temporary_deposit_pre_days):
                continue

            # Look for a similar-sized withdrawal shortly after the credit.
            matching_debit: Optional[Transaction] = None
            for debit in debits:
                if not self._amounts_similar(credit.amount, debit.amount):
                    continue
                debit_date = self._parse_date(debit.date)
                if debit_date is None:
                    continue
                gap = (debit_date - credit_date).days
                if 0 <= gap <= self.temporary_deposit_post_days:
                    matching_debit = debit
                    break

            if matching_debit is None:
                continue

            same_amount = abs(credit.amount - matching_debit.amount) <= 0.005
            # Strength: timing near end (1) + withdrawn shortly after (1) +
            # exact amount match (1).
            strength = 2
            if same_amount:
                strength += 1

            explanation = (
                f"Temporary deposit: a credit of {credit.amount:,.2f} on "
                f"{credit.date} ({days_before_end} day(s) before the statement "
                f"period end) was withdrawn as a debit of "
                f"{matching_debit.amount:,.2f} on {matching_debit.date} shortly "
                f"after. This pattern temporarily inflates the closing balance."
            )
            suggested_action = (
                "Disregard the inflated closing balance and request balances "
                "across the full period; confirm the deposit was genuine "
                "working capital rather than a window-dressing transfer."
            )
            findings.append(
                CreditKitingFinding(
                    pattern="temporary_deposit",
                    risk_level=self._risk_from_strength(strength),
                    explanation=explanation,
                    suggested_action=suggested_action,
                    related_transactions=[credit, matching_debit],
                )
            )

        return findings

    # ------------------------------------------------------------------ #
    # Public API
    # ------------------------------------------------------------------ #
    _RISK_ORDER = {"high": 0, "medium": 1, "low": 2}

    def detect(
        self,
        transactions: List[Transaction],
        statement_period: Optional[str] = None,
    ) -> List[CreditKitingFinding]:
        """Detect credit-kiting patterns in a list of transactions.

        Args:
            transactions: All transactions (credits and debits) for the period.
            statement_period: Optional period string (e.g.,
                "01 MAY 2026 - 31 MAY 2026") used by the temporary-deposit
                detector.

        Returns:
            A list of ``CreditKitingFinding`` objects ordered by risk level
            (high → medium → low).
        """
        print("\n========== CREDIT KITING ==========")
        print(f"Transactions received: {len(transactions)}")
        transactions = transactions or []

        credits = [
            t for t in transactions
            if (t.transaction_type or "").lower() == "credit"
        ]
        debits = [
            t for t in transactions
            if (t.transaction_type or "").lower() == "debit"
        ]
        print(f"Credits: {len(credits)}")
        print(f"Debits: {len(debits)}")

        median_amount = self._median([t.amount for t in transactions])
        period_end = self._parse_statement_period_end(statement_period)

        findings: List[CreditKitingFinding] = []
        findings.extend(self._detect_circular(credits, debits))
        findings.extend(self._detect_related_party(credits, median_amount))
        findings.extend(
            self._detect_temporary_deposit(credits, debits, period_end)
        )

        findings.sort(key=lambda f: self._RISK_ORDER.get(f.risk_level, 99))
        print(f"Findings detected: {len(findings)}")

        for f in findings:
            print(
                f.pattern,
                f.risk_level,
                [t.description for t in f.related_transactions]
            )

        print("===================================\n")
        return findings

"""Shared, bank-agnostic statement-period detection.

The OCR engine is responsible only for extracting text. This module performs
flexible post-OCR normalisation and date-range detection so every bank can use
the same statement-period logic.
"""

from __future__ import annotations

import calendar
import re
import unicodedata
from dataclasses import dataclass
from datetime import date, datetime
from typing import Optional


@dataclass(frozen=True)
class StatementPeriod:
    """A normalised statement date range."""

    start_date: date
    end_date: date
    raw_match: str

    @property
    def text(self) -> str:
        """Return the range in one consistent format used by the app."""
        return (
            f"{self.start_date.strftime('%d %b %Y').upper()} - "
            f"{self.end_date.strftime('%d %b %Y').upper()}"
        )

    @property
    def month(self) -> int:
        return self.end_date.month

    @property
    def year(self) -> int:
        return self.end_date.year

    @property
    def label(self) -> str:
        return f"{calendar.month_name[self.month]} {self.year}"


# Date shapes commonly found in Singapore bank statements.
_TEXT_DATE = r"\d{1,2}\s+[A-Za-z]{3,9}\.?\s+\d{2,4}"
_NUMERIC_DATE = r"\d{1,2}[./-]\d{1,2}[./-]\d{2,4}"
_ISO_DATE = r"\d{4}[./-]\d{1,2}[./-]\d{1,2}"
_DATE_TOKEN = rf"(?:{_TEXT_DATE}|{_NUMERIC_DATE}|{_ISO_DATE})"

# Anchoring to a period label prevents us from accidentally treating two
# transaction dates as the statement period.
_PERIOD_LABEL = (
    r"(?:statement\s*period|statement\s*date\s*range|"
    r"account\s*period|period\s*covered|statement\s*cycle|period)"
)
_RANGE_SEPARATOR = r"(?:to|through|until|thru|-)"

_LABELED_RANGE_RE = re.compile(
    rf"{_PERIOD_LABEL}\s*[:;|.\-]*\s*(?:from\s*)?"
    rf"(?P<start>{_DATE_TOKEN})\s*{_RANGE_SEPARATOR}\s*"
    rf"(?P<end>{_DATE_TOKEN})",
    re.IGNORECASE,
)

# Some statements place "FROM" and "TO" around the dates after a nearby label.
_LABELED_FROM_TO_RE = re.compile(
    rf"{_PERIOD_LABEL}\s*[:;|.\-]*\s*from\s*"
    rf"(?P<start>{_DATE_TOKEN})\s*to\s*(?P<end>{_DATE_TOKEN})",
    re.IGNORECASE,
)

_DATE_FORMATS = (
    "%d %b %Y",
    "%d %B %Y",
    "%d %b %y",
    "%d %B %y",
    "%d/%m/%Y",
    "%d-%m-%Y",
    "%d.%m.%Y",
    "%d/%m/%y",
    "%d-%m-%y",
    "%d.%m.%y",
    "%Y-%m-%d",
    "%Y/%m/%d",
    "%Y.%m.%d",
)


def _normalise_text(text: str) -> str:
    """Normalise common PDF/OCR spacing and punctuation differences."""
    value = unicodedata.normalize("NFKC", text or "")
    value = (
        value.replace("–", "-")
        .replace("—", "-")
        .replace("−", "-")
        .replace("‑", "-")
        .replace("\u00a0", " ")
    )
    return re.sub(r"\s+", " ", value).strip()


def _parse_date(value: str) -> Optional[date]:
    cleaned = re.sub(r"\s+", " ", value.strip())
    cleaned = re.sub(r"(?i)([A-Za-z]{3,9})\.", r"\1", cleaned)

    for fmt in _DATE_FORMATS:
        try:
            parsed = datetime.strptime(cleaned, fmt).date()
            # Reject obvious OCR garbage while allowing historical statements.
            if 1990 <= parsed.year <= 2100:
                return parsed
        except ValueError:
            continue

    return None


def extract_statement_period(text: str) -> Optional[StatementPeriod]:
    """Detect a statement period without relying on a bank-specific parser.

    Supported examples include::

        Statement Period: 01 JUN 2026 - 15 JUN 2026
        Statement Period 01 JUN 2026 TO 30 JUN 2026
        Period: 01/06/2026 to 30/06/2026
        Statement Date Range: 2026-06-01 through 2026-06-30

    The search is label-anchored to reduce false positives from transaction rows.
    """
    normalised = _normalise_text(text)
    if not normalised:
        return None

    for pattern in (_LABELED_FROM_TO_RE, _LABELED_RANGE_RE):
        match = pattern.search(normalised)
        if not match:
            continue

        start_date = _parse_date(match.group("start"))
        end_date = _parse_date(match.group("end"))

        if start_date is None or end_date is None:
            continue

        # A statement can cross year-end, but an inverted or implausibly long
        # range is probably an OCR false positive.
        if end_date < start_date:
            continue
        if (end_date - start_date).days > 400:
            continue

        return StatementPeriod(
            start_date=start_date,
            end_date=end_date,
            raw_match=match.group(0),
        )

    return None


def detect_statement_period(text: str) -> Optional[str]:
    """Compatibility helper returning the normalised range as a string."""
    result = extract_statement_period(text)
    return result.text if result else None

"""IRAS Notice of Assessment (NOA) parser implementation.

Unlike the bank statement parsers, an IRAS NOA is not a bank statement, so this
parser does not inherit from ``BaseBankParser``. Instead it exposes a clean
``parse(text) -> dict`` method returning the individual's name, total income, and
year of assessment extracted from the NOA document text.
"""

import re
from typing import Optional


class IrasNoaParser:
    """Parser for IRAS Notice of Assessment (Individual) documents.

    Extracts:
    - The taxpayer's (individual's) name
    - The total income amount (in SGD)
    - The year of assessment

    Example NOA text layout::

        IRAS NOTICE OF ASSESSMENT
        INLAND REVENUE AUTHORITY OF SINGAPORE YEAR OF ASSESSMENT 2026
        JOYCE TAN Tax Reference No: TXXXX123A
        ...
        TOTAL INCOME 137,400.00
    """

    # Amount pattern: numbers with optional thousands separators and 2 decimals.
    _AMOUNT_PATTERN = re.compile(r"-?[\d,]+\.\d{2}")

    def parse(self, text: str) -> dict:
        """Parse an IRAS NOA document into structured data.

        Args:
            text: The full extracted text from the IRAS NOA document.

        Returns:
            A dict with keys ``individual_name``, ``total_income`` and
            ``year_of_assessment``. Any field that cannot be identified is
            returned as ``None``.
        """
        return {
            "individual_name": self.extract_individual_name(text),
            "total_income": self.extract_total_income(text),
            "year_of_assessment": self.extract_year_of_assessment(text),
        }

    def extract_individual_name(self, text: str) -> Optional[str]:
        """Extract the taxpayer's name from the NOA document.

        The individual's name appears on the line immediately preceding the
        "Tax Reference No:" label, e.g.::

            JOYCE TAN Tax Reference No: TXXXX123A

        Args:
            text: The full extracted text from the IRAS NOA document.

        Returns:
            The taxpayer's name if found, or None if it cannot be identified.
        """
        lines = text.split("\n")

        # Primary strategy: the name precedes "Tax Reference No" on the same line.
        for line in lines:
            if "Tax Reference No" in line:
                name = line.split("Tax Reference No")[0].strip()
                # Strip a trailing colon if the split left one behind.
                name = name.rstrip(":").strip()
                if name:
                    return name
                break

        # Fallback: the name is the first non-header line after the
        # "YEAR OF ASSESSMENT" header line.
        for i, line in enumerate(lines):
            if "YEAR OF ASSESSMENT" in line.upper():
                for j in range(i + 1, min(i + 4, len(lines))):
                    candidate = lines[j].strip()
                    if candidate:
                        # Remove any trailing labels that share the line.
                        candidate = re.split(
                            r"\s{2,}|Tax Reference|Notice", candidate
                        )[0].strip()
                        if candidate:
                            return candidate
                break

        return None

    def extract_total_income(self, text: str) -> Optional[float]:
        """Parse the total income amount from the NOA.

        Looks for the "TOTAL INCOME" line and parses the associated SGD amount,
        e.g. ``TOTAL INCOME 137,400.00`` -> ``137400.00``.

        Args:
            text: The full extracted text from the IRAS NOA document.

        Returns:
            The total income as a float, or None if it cannot be identified.
        """
        lines = text.split("\n")

        for line in lines:
            # Match "TOTAL INCOME" but not "ASSESSABLE INCOME" or other lines.
            if re.search(r"\bTOTAL\s+INCOME\b", line, re.IGNORECASE):
                amounts = self._AMOUNT_PATTERN.findall(line)
                if amounts:
                    # The total income value is the last amount on the line.
                    return self._parse_amount(amounts[-1])

        return None

    def extract_year_of_assessment(self, text: str) -> Optional[str]:
        """Identify the year of assessment from the NOA.

        Looks for the "YEAR OF ASSESSMENT <year>" header, e.g.::

            INLAND REVENUE AUTHORITY OF SINGAPORE YEAR OF ASSESSMENT 2026

        Args:
            text: The full extracted text from the IRAS NOA document.

        Returns:
            The year of assessment as a string (e.g., "2026"), or None if it
            cannot be identified.
        """
        match = re.search(
            r"YEAR\s+OF\s+ASSESSMENT\s+(\d{4})", text, re.IGNORECASE
        )
        if match:
            return match.group(1)

        return None

    def _parse_amount(self, amount_str: str) -> float:
        """Parse an SGD-formatted amount string to a float.

        Handles:
        - Commas as thousand separators (e.g., "137,400.00")
        - Standard decimal format (e.g., "0.00")
        - Optional leading minus sign (e.g., "-200.00")

        Args:
            amount_str: The amount string to parse.

        Returns:
            The parsed amount as a float.
        """
        cleaned = amount_str.replace(",", "").strip()
        return float(cleaned)

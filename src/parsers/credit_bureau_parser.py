"""
Parser for Singapore Credit Bureau Consumer Report.
"""

import re

PASS_GRADES = {
    "AA",
    "BB",
    "CC",
    "DD",
    "EE",
    "FF"
}


class CreditBureauParser:

    def extract(self, text):

        bureau_section = self._extract_bureau_score_section(text)

        score = self._extract_score(bureau_section)
        risk_grade = self._extract_risk_grade(bureau_section)
        risk_grade_description = self._extract_risk_grade_description(bureau_section)
        probability_of_default = self._extract_probability_of_default(bureau_section)

        return {
            "score": score,
            "risk_grade": risk_grade,
            "grade_type": "Scored" if score is not None else "Non-Scored",
            "risk_grade_description": risk_grade_description,
            "probability_of_default": probability_of_default,
            "passed": risk_grade in PASS_GRADES,
            "narratives": self._extract_narratives(text)
        }

    # ==========================================================
    # Bureau Score Section
    # ==========================================================

    def _extract_bureau_score_section(self, text):

        start = re.search(
            r"Bureau\s+Score",
            text,
            re.IGNORECASE
        )

        if not start:
            return ""

        end = re.search(
            r"Narratives",
            text[start.end():],
            re.IGNORECASE
        )

        if end:
            return text[
                start.end():
                start.end() + end.start()
            ]

        return text[start.end():]

    # ==========================================================
    # Score
    # ==========================================================

    def _extract_score(self, section):

        match = re.search(

            r"Score[\s\.:]*(Not\s+Applicable|\d{3,4})",
            section,
            re.IGNORECASE | re.DOTALL
        )

        if not match:
            return None

        value = match.group(1)

        if value.lower() == "not applicable":
            return None

        return int(value)

    # ==========================================================
    # Risk Grade
    # ==========================================================

    def _extract_risk_grade(self, section):

        match = re.search(

            r"Risk\s+Grade[\s\.:]*([A-Z]{2})",
            section,
            re.IGNORECASE | re.DOTALL
        )

        if match:
            return match.group(1)

        return None

    # ==========================================================
    # Risk Grade Description
    # ==========================================================

    def _extract_risk_grade_description(self, section):

        match = re.search(

            r"Risk\s+Grade\s+Description[\s\.:]*(.*?)(?=Probability\s+of\s+Default|$)",
            section,
            re.IGNORECASE | re.DOTALL
        )

        if match:
            return " ".join(match.group(1).split())

        return None

    # ==========================================================
    # Probability of Default
    # ==========================================================

    def _extract_probability_of_default(self, section):

        match = re.search(

            r"Probability\s+of\s+Default[\s\.:]*(Not\s+Applicable|\d+(?:\.\d+)?%)",
            section,
            re.IGNORECASE | re.DOTALL
        )

        if match:
            return match.group(1)

        return None
    
    # ============================================================
    # Narratives Table
    # ============================================================

    def _extract_narratives(self, text: str):

        narratives = []

        # Locate Narratives table
        start_match = re.search(
            r"Narratives",
            text,
            re.IGNORECASE
        )

        if not start_match:
            return narratives

        # Locate next section
        end_match = re.search(
            r"Other\s+Information",
            text[start_match.end():],
            re.IGNORECASE
        )

        if end_match:

            table_text = text[
                start_match.end():
                start_match.end() + end_match.start()
            ]

        else:
            table_text = text[start_match.end():]

        lines = [
            line.strip()
            for line in table_text.splitlines()
            if line.strip()
        ]

        i = 0

        while i < len(lines):

            # Skip table header
            if lines[i].startswith("Date Loaded"):
                i += 1
                continue

            # Match a new narrative row
            match = re.match(
                r"(\d{2}/\d{2}/\d{4})\s+(.+)",
                lines[i]
            )

            if not match:
                i += 1
                continue

            date_loaded = match.group(1)
            narrative_type = match.group(2).strip()

            i += 1

            description = []

            while i < len(lines):

                # Next record starts
                if re.match(
                    r"\d{2}/\d{2}/\d{4}\s+",
                    lines[i]
                ):
                    break

                description.append(lines[i])

                i += 1

            narratives.append({
                "date_loaded": date_loaded,
                "type": narrative_type,
                "description": " ".join(description)
            })

        return narratives
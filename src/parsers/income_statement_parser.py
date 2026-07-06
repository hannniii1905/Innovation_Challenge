import re


class IncomeStatementParser:

    def extract(self, text):

        result = {
            "revenue": 0.0,
            "ebitda": 0.0,
            "tnw": 0.0,
            "net_profit": 0.0,
        }

        patterns = {

            "revenue": r"revenue.*?([\d,]+\.\d{2})",

            "ebitda": r"ebitda.*?([\d,]+\.\d{2})",

            "tnw": r"(?:total\s+net\s+worth|tnw).*?([\d,]+\.\d{2})",

            "net_profit": r"(?:net\s+profit|profit\s+after\s+tax).*?([\d,]+\.\d{2})",
        }

        for field, pattern in patterns.items():

            match = re.search(
                pattern,
                text,
                re.IGNORECASE | re.DOTALL
            )

            if match:

                result[field] = float(
                    match.group(1).replace(",", "")
                )

        return result
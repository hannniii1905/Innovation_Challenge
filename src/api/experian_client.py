import logging
from src.mock_data.company_profiles import COMPANY_PROFILES
logger = logging.getLogger("ocr_analyzer")


class ExperianBureauClient:
    """
    Mock Experian API.
    """
    def fetch_corporate_bureau_data(self, uen: str):
        logger.info(
            f"Searching Experian for {uen}"
        )
        profile = None
        for company in COMPANY_PROFILES.values():
            if company["uen"] == uen:
                profile = company
                break

        if profile is None:
            raise ValueError(
                f"Unknown UEN {uen}"
            )

        return {
            "success": True,
            "bureau_data": {
                "uen": profile["uen"],
                "company_name": profile["company_name"],
                "credit_rating_grade": profile["credit_rating_grade"],
                "litigation_count": profile["litigation_count"],
                "has_adverse_bureau_records":
                    profile["has_adverse_bureau_records"],
                "corporate_charges":
                    profile["corporate_charges"]
            }
        }
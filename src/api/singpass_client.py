import logging
from src.mock_data.company_profiles import COMPANY_PROFILES
logger = logging.getLogger("ocr_analyzer")


class MockSingpassClient:
    """
    Mock MyInfo Business API.
    """
    def exchange_code_for_profile(self, profile_id: int):
        logger.info(
            f"Loading mock company profile {profile_id}"
        )
        if profile_id not in COMPANY_PROFILES:
            raise ValueError(
                f"Unknown profile {profile_id}"
            )
        return {
            "success": True,
            "data": COMPANY_PROFILES[profile_id]
        }
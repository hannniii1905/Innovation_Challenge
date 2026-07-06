"""Mock ACRA registry client.

Provides a Bizfile-style company lookup by UEN and a mock "keyman approval"
notification service. This backs two demo scenarios:

  1. A loan applicant who is NOT an authorised keyman of the company. We look
     up the company's keymen (directors) from ACRA and notify them to seek
     approval.
  2. An applicant without Singpass/Corppass (e.g. a foreigner) who retrieves
     the company profile directly by typing in the UEN instead of logging in
     via MyInfo Business.

Everything here is mocked. Known UENs map to the demo COMPANY_PROFILES; any
other UEN returns a synthesized ACRA record so the demo is never blocked.
"""

import logging
import re
from typing import Dict, List, Optional

from src.mock_data.company_profiles import COMPANY_PROFILES

logger = logging.getLogger("ocr_analyzer")

# Domain used to synthesize mock keyman email addresses from director names.
_MOCK_EMAIL_DOMAIN = "acra-demo.sg"


def _email_from_name(name: str, domain: str = _MOCK_EMAIL_DOMAIN) -> str:
    """Build a deterministic mock email address from a person's name."""
    slug = re.sub(r"[^a-z0-9]+", ".", name.strip().lower()).strip(".")
    slug = slug or "authorised.officer"
    return f"{slug}@{domain}"


def mask_email(email: str) -> str:
    """Partially mask an email for display, e.g. 'al***@acra-demo.sg'."""
    try:
        local, domain = email.split("@", 1)
    except ValueError:
        return email
    if len(local) <= 2:
        visible = local[:1]
    else:
        visible = local[:2]
    return f"{visible}{'*' * max(3, len(local) - len(visible))}@{domain}"


def _profile_for_uen(uen: str) -> Optional[dict]:
    """Return the demo profile whose UEN matches (case-insensitive)."""
    if not uen:
        return None
    target = uen.strip().upper()
    for profile in COMPANY_PROFILES.values():
        if str(profile.get("uen", "")).strip().upper() == target:
            return profile
    return None


def _keymen_from_directors(directors: List[str]) -> List[Dict[str, str]]:
    """Turn a list of director names into keyman records with mock emails."""
    keymen: List[Dict[str, str]] = []
    for index, name in enumerate(directors):
        keymen.append(
            {
                "name": name,
                "email": _email_from_name(name),
                # First-listed director is treated as the appointed
                # authorising officer for the demo.
                "role": "Director / Authorised Approver"
                if index == 0
                else "Director",
            }
        )
    return keymen


def lookup_company(uen: str) -> Dict:
    """Look up a company by UEN from the (mock) ACRA registry.

    Known demo UENs map to COMPANY_PROFILES. Unknown UENs return a synthesized
    record so the demo flow (e.g. a foreign applicant typing any UEN) is never
    blocked.
    """
    profile = _profile_for_uen(uen)

    if profile is not None:
        keymen = _keymen_from_directors(profile.get("directors", []))
        logger.info("ACRA lookup matched demo profile for UEN %s", uen)
        return {
            "found": True,
            "uen": profile["uen"],
            "company_name": profile["company_name"],
            "incorporation_date": profile.get("incorporation_date"),
            "ssic_code": profile.get("ssic_code"),
            "ssic_description": profile.get("ssic_description"),
            "entity_status": "Live Company",
            "keymen": keymen,
        }

    # Fallback synthesized record for unknown UENs.
    logger.info("ACRA lookup synthesized a record for unknown UEN %s", uen)
    normalized = (uen or "UNKNOWN").strip().upper()
    return {
        "found": False,
        "uen": normalized,
        "company_name": f"REGISTERED ENTITY ({normalized})",
        "incorporation_date": None,
        "ssic_code": None,
        "ssic_description": "General business entity",
        "entity_status": "Live Company",
        "keymen": _keymen_from_directors(
            ["Registered Director A", "Registered Director B"]
        ),
    }


def request_keyman_approval(
    uen: str,
    applicant_name: str,
    applicant_email: str,
) -> Dict:
    """Mock: notify a company's keymen to approve an application.

    Extracts the keymen from ACRA and "sends" each an approval email. This is
    a demo stub — it logs the notifications rather than sending real mail, and
    returns the list of notified keymen. It never blocks the flow.
    """
    company = lookup_company(uen)
    keymen = company.get("keymen", [])

    notified: List[Dict[str, str]] = []
    for keyman in keymen:
        # In production this is where an email/notification would be sent.
        logger.info(
            "[MOCK EMAIL] To %s <%s>: %s (applicant: %s <%s>) requests your "
            "approval to apply for BizMoney financing on behalf of %s (UEN %s).",
            keyman["name"],
            keyman["email"],
            keyman["role"],
            applicant_name or "Unknown applicant",
            applicant_email or "no-email-provided",
            company["company_name"],
            company["uen"],
        )
        notified.append(
            {
                "name": keyman["name"],
                "email": keyman["email"],
                "masked_email": mask_email(keyman["email"]),
                "role": keyman["role"],
                "notified": True,
            }
        )

    return {
        "status": "PENDING_KEYMAN_APPROVAL",
        "uen": company["uen"],
        "company_name": company["company_name"],
        "applicant_name": applicant_name,
        "applicant_email": applicant_email,
        "notified_keymen": notified,
        "message": (
            f"Approval requests sent to {len(notified)} authorised keyman(s). "
            f"The application can proceed once a keyman approves."
        ),
    }

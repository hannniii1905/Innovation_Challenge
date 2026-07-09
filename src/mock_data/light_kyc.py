"""Mock Light KYC screening data for the demo credit workbench.

This keeps all demo screening logic in one place so the frontend can render the
same four checks consistently:
  1. AML
  2. Bank-wide CIF Blacklist
  3. Industry Blacklist
  4. On-us / Off-us Check
"""

from __future__ import annotations

from typing import Any


EXCLUDED_INDUSTRIES = [
    "casino",
    "military",
    "night club",
    "nightclub",
]

# Demo hits can be keyed by UEN or exact upper-case company name.
AML_HITS = {
    "202012345R": "Adverse media / sanctions screening hit on connected party.",
    # "ABC SCAM PTE LTD": "Applicant matched AML watchlist demo record.",
}

BANK_WIDE_CIF_BLACKLIST = {
    "201844192K": "Prior account closure under bank-wide CIF blacklist policy.",
    "VORTEX RETAIL SINGAPORE PTE. LTD.": "Internal blacklist record found for applicant CIF.",
}

ON_US_OFF_US_ADVERSE = {
    "202012345R": "Off-us bureau shows unresolved returned-cheque / delinquency indicator.",
    # "202012345R": "On-us conduct shows material excesses and repeated arrears.",
}


def _norm(value: Any) -> str:
    return str(value or "").strip().upper()


def _contains_excluded_industry(industry: str | None) -> tuple[bool, str | None]:
    low = str(industry or "").lower()
    for excluded in EXCLUDED_INDUSTRIES:
        if excluded in low:
            return True, excluded
    return False, None


def run_light_kyc(app_record: Any) -> dict:
    """Return the four Light KYC checks for an application record.

    The result is intentionally JSON-friendly because it is persisted into
    StagedApplication.underwriting_json and rendered directly by React.
    """
    uen = _norm(getattr(app_record, "uen", ""))
    company_name = _norm(getattr(app_record, "company_name", ""))
    industry = getattr(app_record, "industry", None)

    def lookup(table: dict[str, str]) -> str:
        return table.get(uen) or table.get(company_name) or ""

    aml_reason = lookup(AML_HITS)
    cif_reason = lookup(BANK_WIDE_CIF_BLACKLIST)
    exposure_reason = lookup(ON_US_OFF_US_ADVERSE)
    industry_blocked, matched_industry = _contains_excluded_industry(industry)

    checks = [
        {
            "key": "aml",
            "label": "AML",
            "passed": not bool(aml_reason),
            "status": "Clear" if not aml_reason else "Review",
            "description": "Company and keymen screened against AML, sanctions and adverse media lists.",
            "source": "Mock AML / sanctions watchlist",
            "reason": aml_reason,
        },
        {
            "key": "bank_wide_cif_blacklist",
            "label": "Bank-wide CIF Blacklist",
            "passed": not bool(cif_reason),
            "status": "Clear" if not cif_reason else "Review",
            "description": "Applicant UEN / CIF checked against internal bank-wide blacklist records.",
            "source": "Mock internal CIF blacklist",
            "reason": cif_reason,
        },
        {
            "key": "industry_blacklist",
            "label": "Industry Blacklist",
            "passed": not industry_blocked,
            "status": "Clear" if not industry_blocked else "Review",
            "description": "Business activity checked against excluded industries.",
            "source": "Excluded industries: casino, military, night club",
            "reason": (
                f"Excluded industry detected: {industry}. Matched '{matched_industry}'."
                if industry_blocked
                else ""
            ),
        },
        {
            "key": "on_us_off_us",
            "label": "On-us / Off-us Check",
            "passed": not bool(exposure_reason),
            "status": "Clear" if not exposure_reason else "Review",
            "description": "Checks existing UOB conduct and external/off-us banking exposure indicators.",
            "source": "Mock bank conduct + bureau exposure file",
            "reason": exposure_reason,
        },
    ]

    passed = all(check["passed"] for check in checks)
    failed_checks = [check for check in checks if not check["passed"]]

    return {
        "passed": passed,
        "status": "Clear" if passed else "Review",
        "checks": checks,
        "failed_checks": failed_checks,
        "excluded_industries": EXCLUDED_INDUSTRIES,
        "summary": (
            "All Light KYC checks cleared."
            if passed
            else "; ".join(check["reason"] for check in failed_checks if check.get("reason"))
        ),
    }

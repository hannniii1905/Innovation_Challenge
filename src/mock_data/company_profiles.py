# src/mock_data/company_profiles.py

COMPANY_PROFILES = {

    # ============================================================
    # PROFILE 1 - GOOD COMPANY (APPROVED)
    # ============================================================

    1: {

        "uen": "202188341M",
        "company_name": "NEXUS INNOVATION PTE. LTD.",
        "incorporation_date": "2021-03-15",
        "ssic_code": "62011",
        "ssic_description": "Development of software and applications",
        "registered_address": "71 Ayer Rajah Crescent, #03-12, Singapore 139951",
        "directors": [
            "Alex Tan Wei Liang",
            "Sarah Lim Xiu Qi"
        ],
        # Experian
        "credit_rating_grade": "CX1",
        "litigation_count": 0,
        "has_adverse_bureau_records": False,
        "corporate_charges": [],
        # Credit Bureau
        "credit_bureau_grade": "AA"

    },

    # ============================================================
    # PROFILE 2 - FURTHER REVIEW
    # ============================================================

    2: {

        "uen": "201844192K",
        "company_name": "VORTEX RETAIL SINGAPORE PTE. LTD.",
        "incorporation_date": "2018-07-22",
        "ssic_code": "47112",
        "ssic_description": "Supermarkets and Department Stores",
        "registered_address": "3 Tampines Central 1, #05-08, Singapore 529540",
        "directors": [
            "Adam Low",
            "Mary Ong"
        ],
        "credit_rating_grade": "CX3",
        "litigation_count": 1,
        "has_adverse_bureau_records": False,
        "corporate_charges": [
            {
                "charge_number": "CHG-2025-10381",
                "charge_amount": 85000,
                "currency": "SGD",
                "chargee_bank": "OCBC BANK",
                "status": "OPEN",
                "creation_date": "2025-01-11"
            }
        ],
        "credit_bureau_grade": "CC"
    },

    # ============================================================
    # PROFILE 3 - REJECT
    # ============================================================

    3: {

        "uen": "202012345R",
        "company_name": "ORION WEALTH MANAGEMENT PTE. LTD.",
        "incorporation_date": "2020-10-09",
        "ssic_code": "66301",
        "ssic_description": "Fund/Asset Management",
        "registered_address": "8 Changi South Lane, #02-01, Singapore 486113",
        "directors": [
            "Michael Ong",
            "Daniel Goh"
        ],
        "credit_rating_grade": "DP2",
        "litigation_count": 3,
        "has_adverse_bureau_records": True,
        "corporate_charges": [
            {
                "charge_number": "CHG-2024-91822",
                "charge_amount": 450000,
                "currency": "SGD",
                "chargee_bank": "DBS BANK",
                "status": "OPEN",
                "creation_date": "2024-06-18"
            }
        ],
        "credit_bureau_grade": "HX"
    }
}
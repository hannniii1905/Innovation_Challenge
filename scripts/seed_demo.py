"""Seed the demo database with a clean, presentation-ready portfolio.

Every application gets a COMPLETE underwriting bundle:
  - CBS grade + pass/fail
  - Keymen pulled from ACRA (name, role, shareholding, DOB) ranked high->low
  - Personal guarantors auto-selected to exceed 50% shareholding, age-checked
  - Credit Flash Model probability of default
  - Financials: DSCR (industry income factor applied), EBITDA, TNW,
    MUE (Maximum On-us clean Exposure), FCC (month-end bank balance)
  - Credit-kiting detection + 6-month recurring-debt detection

Portfolio distribution: ~80% auto-approved, 15% review, 5% rejected.

Run:  .venv/bin/python3.11 -m scripts.seed_demo
"""

from datetime import date

from src.database import SessionLocal, StagedApplication, init_db

MONTHS = ["2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06"]
RATE = 0.0775  # indicative p.a.
CBS_FAIL = {"HH", "HX", "HZ"}
GRADE_PD = {"AA": 1.5, "BB": 2.5, "CC": 5.0, "DD": 8.0, "EE": 12.0,
            "FF": 18.0, "GG": 25.0, "HH": 40.0, "HX": 55.0, "HZ": 70.0}

# Fraction of annual revenue treated as serviceable income for debt cover,
# by industry sector. This is the "industry income factor" used in the DSCR.
INDUSTRY_FACTORS = [
    (("software", "application", "tech", "r&d", "consult"), 0.34),
    (("media",), 0.30),
    (("wellness", "interior", "landscap"), 0.22),
    (("engineering",), 0.20),
    (("marine", "logistic", "courier", "freight", "textile", "food manufactur"), 0.16),
    (("construction",), 0.13),
    (("pharma", "supermarket", "retail", "f&b", "auto"), 0.13),
    (("wholesale", "trade"), 0.11),
]

# Keyman name pool + birth years (kept mostly 34-57 so age checks pass).
NAME_POOL = [
    ("Alex Tan Wei Liang", 1985), ("Sarah Lim Xiu Qi", 1990),
    ("Rajesh Kumar s/o Devan", 1978), ("Grace Chua Hui Min", 1988),
    ("Benjamin Ng Jun Hao", 1992), ("Kelvin Wong Kok Wai", 1969),
    ("Clara Low Mei Ling", 1980), ("Alicia Teo Min", 1983),
    ("Marcus Sim Boon Keng", 1975), ("Priya Nair", 1986),
    ("Hafiz Bin Rahman", 1991), ("Jonathan Lee Chee Wai", 1972),
    ("Daniel Goh Wei Ming", 1981), ("Steven Tan Kok Leong", 1974),
    ("Michelle Koh Swee Lian", 1987), ("Arjun Menon", 1990),
    ("Lim Wei Jie", 1989), ("Farah Ismail", 1984),
    ("Victor Chan Yao Ming", 1976), ("Natalie Wong", 1993),
    ("Gopal Krishnan", 1971), ("Serene Ang Li Wen", 1985),
    ("Bryan Tay Jun Wei", 1982), ("Ivy Ho Kai Xin", 1979),
]

# Shareholding splits (sum to 100, top < 50 so >1 guarantor is usually needed).
SPLITS = {3: [45, 35, 20], 4: [40, 30, 20, 10], 5: [38, 27, 20, 10, 5],
          6: [35, 25, 15, 10, 8, 7]}


def industry_factor(industry):
    low = (industry or "").lower()
    for keys, factor in INDUSTRY_FACTORS:
        if any(k in low for k in keys):
            return factor
    return 0.18


def age_from_year(year):
    return date.today().year - year


def nric_from(name):
    return f"S{abs(hash(name)) % 9}•••••{chr(65 + abs(hash(name)) % 26)}"


def build_keymen(offset, count, aged_majority=False):
    split = SPLITS[count]
    keymen = []
    for i in range(count):
        name, year = NAME_POOL[(offset + i) % len(NAME_POOL)]
        if aged_majority and i == 0:
            year = 1956  # majority holder near/over guarantor age cap
        keymen.append({
            "name": name,
            "role": "Director / Shareholder" if i < 2 else "Shareholder",
            "shareholding": split[i],
            "dob": f"{year}-{(i * 3 + 4):02d}-{(i * 5 + 10):02d}",
            "nric": nric_from(name),
        })
    return keymen


def select_pgs(keymen, tenure_years):
    """Greedily select top shareholders until coverage >= 50%."""
    ordered = sorted(keymen, key=lambda k: k["shareholding"], reverse=True)
    chosen, coverage = [], 0
    for k in ordered:
        chosen.append(k)
        coverage += k["shareholding"]
        if coverage >= 50:
            break
    pgs = [{
        "name": k["name"],
        "shareholding": k["shareholding"],
        "age": age_from_year(int(k["dob"][:4])),
    } for k in chosen]
    all_pass = all((p["age"] + tenure_years) <= 70 for p in pgs)
    return pgs, coverage, all_pass


def recurring(amount, description, lender, day):
    return [{"month": m, "date": f"{m}-{day:02d}", "amount": amount,
             "description": description, "lender": lender} for m in MONTHS]


def compute_pd(grade, dscr, tnw, kiting_flagged, litigation_high, undeclared, pg_age_fail):
    pd = GRADE_PD.get(grade, 10.0)
    drivers = []
    if kiting_flagged:
        pd += 8; drivers.append("Credit-kiting patterns detected")
    if litigation_high:
        pd += 6; drivers.append("Outstanding litigation / charges")
    if undeclared:
        pd += 5; drivers.append("Undeclared debt facility detected")
    if dscr < 1.2:
        pd += 5; drivers.append("DSCR below 1.20")
    if tnw < 0:
        pd += 8; drivers.append("Negative tangible net worth")
    if pg_age_fail:
        pd += 5; drivers.append("A personal guarantor exceeds the age limit")
    return max(1.0, min(95.0, round(pd, 1))), drivers


def build(cfg, offset):
    tenure_years = max(1, round(cfg["tenure"] / 12))
    keymen = build_keymen(offset, cfg["keymen"], aged_majority=cfg.get("aged_majority"))
    pgs, coverage, age_pass = select_pgs(keymen, tenure_years)

    revenue = cfg["revenue"]
    margin = cfg["margin"]
    ebitda = round(revenue * margin)
    factor = industry_factor(cfg["industry"])
    serviceable = round(revenue * factor)

    existing_monthly = cfg["existing_monthly"]
    annual_new = round(cfg["requested"] * (1 / tenure_years + RATE))
    annual_debt_service = existing_monthly * 12 + annual_new
    dscr = round(serviceable / annual_debt_service, 2) if annual_debt_service else 0.0

    tnw = cfg["tnw"]
    monthly_turnover = revenue / 12
    mue = int(round(monthly_turnover * 2 / 1000) * 1000)  # ~2 months turnover

    base_balance = monthly_turnover * cfg.get("balance_factor", 0.4)
    month_end_balances = [
        {"month": m, "balance": round(base_balance * (0.9 + 0.05 * i))}
        for i, m in enumerate(MONTHS)
    ]
    fcc = round(sum(b["balance"] for b in month_end_balances) / len(month_end_balances))

    grade = cfg["cbs"]
    cbs_pass = grade not in CBS_FAIL
    kiting_flagged = cfg["kiting_score"] >= 30
    lit_high = cfg["litigation_count"] > 0
    pd, drivers = compute_pd(grade, dscr, tnw, kiting_flagged, lit_high,
                             cfg.get("undeclared", False), not age_pass)

    band = ("Low" if pd < 5 else "Moderate" if pd < 15 else "Elevated" if pd < 30 else "High")

    target = cfg["target"]  # APPROVED / REVIEW / REJECT
    if target == "REJECT":
        approved_limit = 0.0
    elif target == "REVIEW":
        approved_limit = float(int(round(min(cfg["requested"], mue) * 0.6 / 1000) * 1000))
    else:
        approved_limit = float(min(cfg["requested"], mue))

    # Debt detection
    if cfg.get("undeclared"):
        debt_items = (recurring(round(existing_monthly * 0.65), "Term loan repayment", cfg.get("lender1", "OCBC Bank"), 5)
                      + recurring(round(existing_monthly * 0.35), "Hire purchase (undeclared)", cfg.get("lender2", "Maybank"), 20))
        undeclared_note = f"Recurring payment to {cfg.get('lender2', 'Maybank')} was not declared."
    else:
        debt_items = recurring(existing_monthly, "Facility repayment", cfg.get("lender1", "Hong Leong Finance"), 14)
        undeclared_note = ""

    kiting_patterns = []
    if kiting_flagged:
        kiting_patterns = [
            {"date": "2026-03-08", "description": "Inbound transfer from related entity", "amount": round(cfg["kiting_volume"] * 0.5), "counterparty": f"{cfg['name'].split()[0]} HOLDINGS PL"},
            {"date": "2026-03-10", "description": "Round-tripped to originator within 48h", "amount": round(cfg["kiting_volume"] * 0.48), "counterparty": f"{cfg['name'].split()[0]} HOLDINGS PL"},
        ]

    system_decision = "APPROVED" if target == "APPROVED" else "NEEDS_FURTHER_REVIEW"
    status = "REJECTED" if target == "REJECT" else "PENDING"
    risk_flags = list(drivers) if target != "APPROVED" else []

    reasons = {
        "APPROVED": "Clean bureau grade, healthy DSCR and no adverse findings. Auto-approved within risk tolerance.",
        "REVIEW": "Elevated PD and/or thin coverage. Referred for manual credit review.",
        "REJECT": "Adverse bureau grade, weak coverage and material risk flags. Declined for obvious reasons.",
    }

    keymen_share = [{"name": k["name"], "role": k["role"], "shareholding": k["shareholding"]} for k in keymen]

    underwriting = {
        "bank_ocr": {"bank": cfg.get("bank", "DBS"), "total_credits": round(revenue / 2),
                     "flagged_kiting_volume": float(cfg["kiting_volume"]) if kiting_flagged else 0.0,
                     "detected_loans": cfg.get("detected_loans", 1),
                     "has_fraud_tampering": cfg.get("tampering", False), "statement_months": 6},
        "credit_bureau": {"grade": grade, "passed": cbs_pass},
        "acra": {"company_status": "Live Company", "registration_date": cfg["incorp"], "shareholders": keymen_share},
        "litigation": {"count": cfg["litigation_count"],
                       "charges": cfg.get("charges", []),
                       "high_risk": lit_high, "passed": not lit_high},
        "aml": {"passed": True, "reason": ""},
        "financials": {
            "annualised_revenue": float(revenue), "ebitda": float(ebitda),
            "ebitda_margin": round(margin * 100, 1), "tnw": float(tnw),
            "industry": cfg["industry"], "industry_income_factor": factor,
            "serviceable_income": float(serviceable),
            "monthly_debt_service": float(existing_monthly),
            "annual_debt_service": float(annual_debt_service),
            "dscr": dscr, "mue": float(mue), "fcc": float(fcc),
            "month_end_balances": month_end_balances,
        },
        "credit_kiting": {"score": cfg["kiting_score"], "flagged": kiting_flagged,
                          "flagged_volume": float(cfg["kiting_volume"]) if kiting_flagged else 0.0,
                          "patterns": kiting_patterns},
        "existing_debt": {"declared": cfg.get("declared", "NIL"),
                          "detected_monthly": float(existing_monthly),
                          "annualised": float(existing_monthly * 12),
                          "consistent_months": 6, "undeclared": cfg.get("undeclared", False),
                          "undeclared_note": undeclared_note, "recurring_deductions": debt_items},
        "risk_model": {"model_name": "Credit Flash Model", "model_version": "v1.2",
                       "pd_percent": pd, "rating_band": band, "approved_limit": approved_limit,
                       "requested_amount": float(cfg["requested"]), "drivers": drivers},
    }

    return StagedApplication(
        status=status, uen=cfg["uen"], company_name=cfg["name"], industry=cfg["industry"],
        requested_quantum=float(cfg["requested"]), declared_loans=cfg.get("declared", "NIL"),
        pre_questionnaire_json={},
        singpass_profile_json={"companyName": cfg["name"], "uen": cfg["uen"],
                               "incorporationDate": cfg["incorp"], "keymen": keymen,
                               "propertyOwnership": "rented", "rentAmount": "5000"},
        personal_guarantors_json=pgs, pg_coverage=float(coverage),
        annualised_revenue=float(revenue), ebitda=float(ebitda), tnw=float(tnw),
        dscr=dscr, fcc=float(fcc), credit_kiting_score=float(cfg["kiting_score"]),
        existing_debt=float(existing_monthly * 12), existing_debt_items=debt_items,
        system_decision=system_decision, system_reason=reasons[target],
        risk_flags=risk_flags, approved_amount=approved_limit,
        underwriting_json=underwriting,
    )


# ---- Portfolio: 16 approve, 3 review, 1 reject (80/15/5) -------------------
APPROVE = [
    ("NEXUS INNOVATION PTE. LTD.", "202188341M", "Development of software and applications", "AA", 1680000, 0.20, 4200, 50000, 36, 6, "2021-03-15"),
    ("SUMMIT ENGINEERING PTE. LTD.", "201512345A", "Engineering services", "BB", 1450000, 0.18, 5200, 60000, 48, 5, "2015-05-12"),
    ("GREENLEAF FOODS PTE. LTD.", "201623456B", "Food manufacturing", "AA", 980000, 0.16, 3100, 50000, 36, 4, "2016-06-01"),
    ("BLUEWAVE MARINE PTE. LTD.", "201734567C", "Marine services", "BB", 1220000, 0.17, 4600, 70000, 48, 5, "2017-02-20"),
    ("APEX MEDIA PTE. LTD.", "201845678D", "Digital media", "AA", 760000, 0.22, 2400, 40000, 36, 3, "2018-09-09"),
    ("PRIME LOGISTICS PTE. LTD.", "201956789E", "Logistics", "CC", 2100000, 0.14, 8200, 90000, 60, 6, "2019-11-03"),
    ("SILVERLINE TRADING PTE. LTD.", "202067890F", "Wholesale trade", "BB", 1680000, 0.12, 5400, 60000, 36, 5, "2020-01-15"),
    ("QUANTUM LABS PTE. LTD.", "202178901G", "R&D services", "AA", 640000, 0.25, 1800, 40000, 36, 3, "2021-07-22"),
    ("HARBOUR CAFE PTE. LTD.", "202289012H", "F&B", "BB", 520000, 0.15, 2100, 30000, 24, 3, "2022-03-30"),
    ("EVERGREEN LANDSCAPES PTE. LTD.", "202390123J", "Landscaping", "CC", 430000, 0.18, 1600, 30000, 36, 4, "2020-10-09"),
    ("NOVA TEXTILES PTE. LTD.", "201401234K", "Textiles manufacturing", "BB", 890000, 0.15, 3300, 50000, 48, 4, "2014-04-18"),
    ("PINNACLE CONSULTING PTE. LTD.", "201512340L", "Management consulting", "AA", 1100000, 0.28, 2600, 50000, 36, 3, "2015-08-08"),
    ("METRO PHARMA PTE. LTD.", "201734562N", "Pharmacy retail", "BB", 1340000, 0.14, 4800, 60000, 48, 5, "2017-12-01"),
    ("SWIFT COURIER PTE. LTD.", "201845673P", "Courier services", "CC", 700000, 0.15, 2600, 40000, 36, 4, "2018-06-14"),
    ("LOTUS WELLNESS PTE. LTD.", "201956784Q", "Wellness services", "AA", 560000, 0.22, 1900, 30000, 24, 3, "2019-02-25"),
    ("CORAL CONSTRUCTION PTE. LTD.", "201623451M", "Construction", "BB", 2450000, 0.13, 9200, 100000, 60, 6, "2016-05-19"),
]

REVIEW = [
    # VORTEX: kiting + undeclared debt + thin DSCR
    {"name": "VORTEX RETAIL SINGAPORE PTE. LTD.", "uen": "201844192K", "industry": "Supermarkets and Department Stores",
     "cbs": "CC", "revenue": 720000, "margin": 0.125, "existing_monthly": 10300, "requested": 120000, "tenure": 48,
     "keymen": 6, "incorp": "2018-07-22", "kiting_score": 46, "kiting_volume": 22000, "litigation_count": 1,
     "undeclared": True, "declared": "Term loan with OCBC (declared)", "bank": "OCBC", "detected_loans": 2,
     "lender1": "OCBC Bank", "lender2": "Maybank", "target": "REVIEW",
     "charges": [{"charge_number": "CHG-2025-10381", "charge_amount": 85000, "currency": "SGD", "chargee_bank": "OCBC BANK", "status": "OPEN"}]},
    {"name": "CASCADE INTERIORS PTE. LTD.", "uen": "202067895R", "industry": "Interior design", "cbs": "DD",
     "revenue": 610000, "margin": 0.14, "existing_monthly": 4200, "requested": 80000, "tenure": 36, "keymen": 4,
     "incorp": "2020-06-10", "kiting_score": 12, "kiting_volume": 0, "litigation_count": 0, "target": "REVIEW"},
    {"name": "TITAN AUTO PARTS PTE. LTD.", "uen": "202178906S", "industry": "Auto parts trade", "cbs": "DD",
     "revenue": 840000, "margin": 0.11, "existing_monthly": 6900, "requested": 90000, "tenure": 48, "keymen": 5,
     "incorp": "2021-01-28", "kiting_score": 22, "kiting_volume": 0, "litigation_count": 0, "target": "REVIEW"},
]

REJECT = [
    {"name": "ORION WEALTH MANAGEMENT PTE. LTD.", "uen": "202012345R", "industry": "Fund/Asset Management", "cbs": "HX",
     "revenue": 380000, "margin": 0.05, "existing_monthly": 18500, "requested": 200000, "tenure": 60, "keymen": 6,
     "incorp": "2020-10-09", "kiting_score": 88, "kiting_volume": 60000, "litigation_count": 3, "undeclared": True,
     "tnw": -50000, "tampering": True, "detected_loans": 3, "bank": "DBS", "aged_majority": True,
     "declared": "Multiple facilities across banks", "lender1": "DBS Bank", "lender2": "UOB", "target": "REJECT",
     "charges": [{"charge_number": "CHG-2024-91822", "charge_amount": 450000, "currency": "SGD", "chargee_bank": "DBS BANK", "status": "OPEN"}]},
]


def approve_cfg(row):
    name, uen, industry, cbs, revenue, margin, existing, requested, tenure, keymen, incorp = row
    return {"name": name, "uen": uen, "industry": industry, "cbs": cbs, "revenue": revenue,
            "margin": margin, "existing_monthly": existing, "requested": requested, "tenure": tenure,
            "keymen": keymen, "incorp": incorp, "kiting_score": 5, "kiting_volume": 0,
            "litigation_count": 0, "tnw": round(revenue * 0.25), "target": "APPROVED",
            "declared": "Equipment financing facility (declared)"}


def main():
    init_db()
    db = SessionLocal()
    try:
        deleted = db.query(StagedApplication).delete()
        db.commit()
        print(f"Wiped {deleted} existing application(s).")

        offset = 0
        for row in APPROVE:
            db.add(build(approve_cfg(row), offset)); offset += 3
        for cfg in REVIEW:
            cfg.setdefault("tnw", round(cfg["revenue"] * 0.2))
            db.add(build(cfg, offset)); offset += 3
        for cfg in REJECT:
            db.add(build(cfg, offset)); offset += 3
        db.commit()

        total = db.query(StagedApplication).count()
        print(f"Seeded {total} applications (16 approve / 3 review / 1 reject).")
    finally:
        db.close()


if __name__ == "__main__":
    main()

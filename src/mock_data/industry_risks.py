import random
import re

INDUSTRY_CATEGORIES = [
    {
        "keywords": ["software", "application", "development", "62011", "technology", "information technology"],
        "sector": "Technology — Software & IT Services",
        "risk_level": "Moderate",
        "growth": "high",
        "grants": "Strong government digitalisation initiatives (Smart Nation, NDI) and enterprise cloud adoption",
        "pressures": [
            "the competitive talent market and rising salary costs for engineers",
            "the pace of technology cycles requiring continuous R&D investment",
            "revenue concentration risk if dependent on a few large clients",
        ],
        "tailwinds": "public-sector digital spending and regional expansion opportunities in Southeast Asia",
        "key_risks_pool": [
            "Talent scarcity & rising salary costs for developers and engineers",
            "Short product lifecycles requiring continuous R&D investment",
            "Concentration risk if revenue depends on a few large clients",
            "Intellectual property protection and cybersecurity liability exposure",
            "Dependence on foreign tech talent with tightening work-pass quotas",
        ],
        "outlook": [
            "Stable — supported by public-sector digital spending and regional expansion opportunities in SEA.",
            "Positive — sustained demand for digital transformation across banking, logistics, and government verticals.",
        ],
    },
    {
        "keywords": ["supermarket", "department", "retail", "store", "47112", "consumer"],
        "sector": "Retail — Supermarkets & Department Stores",
        "risk_level": "Moderate",
        "growth": "low",
        "grants": "stable necessity-driven demand from essential goods and staples",
        "pressures": [
            "intense price competition from regional e-commerce platforms like Shopee and Amazon",
            "high fixed rental costs in prime and centrally-located premises",
            "workforce dependency on foreign labour with tightening quota limits",
        ],
        "tailwinds": "omnichannel transformation and resilience of essential-goods retail",
        "key_risks_pool": [
            "Thin margins driven by price competition with online platforms",
            "High fixed rental costs in prime / centrally-located premises",
            "Workforce dependency on foreign labour with tightening quotas",
            "Inventory and perishable goods spoilage risk",
        ],
        "outlook": [
            "Cautious — omnichannel transformation is necessary to remain competitive. Essential-goods retailers are more resilient than discretionary segments.",
            "Stable for necessity-driven subsegments; discretionary retail faces structural headwinds from changing consumer habits.",
        ],
    },
    {
        "keywords": ["freight", "forwarding", "logistics", "transport", "52291", "warehouse", "shipping"],
        "sector": "Logistics — Freight Forwarding & Warehousing",
        "risk_level": "Elevated",
        "growth": "moderate",
        "grants": "Singapore's position as a global transshipment hub and regional supply chain diversification (China+1)",
        "pressures": [
            "high sensitivity to global trade volumes, fuel costs, and geopolitical disruptions",
            "the cyclical nature of freight demand during economic downturns",
            "high CAPEX requirements for fleet and warehouse infrastructure",
        ],
        "tailwinds": "regional supply chain shifts and growth in e-commerce logistics",
        "key_risks_pool": [
            "Exposure to global trade cycle — volumes decline during economic downturns",
            "Fuel price volatility directly impacting operating margins",
            "Geopolitical risks (Red Sea disruptions, US-China tariffs) affecting shipping routes",
            "High CAPEX requirements for fleet and warehouse infrastructure",
            "Regulatory compliance — customs, safety, and environmental standards",
        ],
        "outlook": [
            "Cautious — near-term headwinds from global trade uncertainty. Medium-term supported by regional supply chain diversification (China+1).",
            "Mixed — freight forwarding faces cyclical pressure while warehousing benefits from e-commerce structural growth.",
        ],
    },
    {
        "keywords": ["manufacturing", "factory", "production", "industrial", "precision", "engineering"],
        "sector": "Manufacturing — General & Precision Engineering",
        "risk_level": "Moderate",
        "growth": "moderate",
        "grants": "government initiatives (Manufacturing 2030, Industry 4.0 grants) and automation adoption",
        "pressures": [
            "cyclical demand sensitivity to global semiconductor and electronics cycles",
            "rising automation costs and the need for continuous CAPEX to stay competitive",
            "dependence on export markets and exposure to tariff and trade-policy shifts",
        ],
        "tailwinds": "the electronics upcycle and Industry 4.0 productivity investments",
        "key_risks_pool": [
            "Cyclical demand — sensitive to global semiconductor and electronics cycles",
            "Rising automation costs and need for continuous CAPEX to remain competitive",
            "Dependence on export markets and tariff/trade-policy shifts",
            "Energy cost sensitivity for heavy manufacturing processes",
        ],
        "outlook": [
            "Stable — supported by the electronics upcycle and government Industry 4.0 grants. Labour-reliant subsegments face structural margin pressure.",
            "Moderately positive — productivity gains from automation adoption offset rising labour costs. Subsegment variance is significant.",
        ],
    },
    {
        "keywords": ["construction", "building", "infrastructure", "real estate", "property"],
        "sector": "Construction & Engineering",
        "risk_level": "Elevated",
        "growth": "moderate",
        "grants": "a pipeline of public infrastructure projects (LTA, HDB, Changi T5) and Building & Construction Authority initiatives",
        "pressures": [
            "acute labour shortages and dependency on foreign workers with tightening quotas",
            "rising raw material costs for steel, concrete, and copper",
            "project delay and penalty risk from supply chain or regulatory issues",
        ],
        "tailwinds": "a multi-year public-sector infrastructure pipeline",
        "key_risks_pool": [
            "Labour shortage and dependency on foreign workers with tightening quotas",
            "Rising raw material costs (steel, concrete, copper)",
            "Project delay and penalty risk from supply chain or regulatory issues",
            "High working capital requirements and progress-billing cash flow gaps",
            "Occupational safety and environmental compliance costs",
        ],
        "outlook": [
            "Moderate — public-sector pipeline provides visibility. Private-sector demand is cyclical and sensitive to interest rates.",
            "Cautiously stable — public infrastructure spending underpins near-term demand, but margin compression persists.",
        ],
    },
    {
        "keywords": ["food", "beverage", "f&b", "restaurant", "catering", "hotel", "hospitality"],
        "sector": "Food & Beverage / Hospitality",
        "risk_level": "High",
        "growth": "low",
        "grants": "tourism and local dining demand as the primary revenue driver",
        "pressures": [
            "an extremely high failure rate — approximately 30% of new F&B outlets close within two years",
            "intense competition and low switching costs for customers",
            "labour shortages compounded by tightening foreign worker quotas",
            "rising rental costs in mall and prime street locations",
        ],
        "tailwinds": "consolidation opportunities for established chains and brands",
        "key_risks_pool": [
            "Very high failure rate — ~30% of new F&B outlets close within 2 years",
            "Extreme rental cost pressure in mall and prime street locations",
            "Labour shortage — reliance on foreign workers with tightening quotas",
            "Food safety compliance and licence risk",
            "Low switching cost for customers — high churn and brand fragility",
            "Delivery-platform commission fees continuing to pressure margins",
        ],
        "outlook": [
            "Challenging — consolidation trend favours established chains over independents. Delivery-platform commission fees continue to pressure margins.",
            "Difficult — margin compression from rising costs and platform fees. Essential F&B subsegments show more resilience.",
        ],
    },
]

SUMMARY_TEMPLATES = [
    "The Singapore {sector} sector is experiencing {growth} growth, driven by {grants}. However, {pressure}.",
    "Singapore's {sector} sector benefits from {grants}. {growth_cap} growth prospects are tempered by {pressure}.",
    "{grants} provides tailwinds for Singapore's {sector} sector. The primary challenge remains {pressure}.",
]

OUTLOOK_SUFFIXES = [
    "Margin dynamics vary significantly by subsegment and business model.",
    "Firms with strong digital capabilities and diversified revenue streams are better positioned.",
    "Capital discipline and cost management will be key differentiators in the current environment.",
    "Regulatory developments and global trade conditions remain important external variables to monitor.",
]


def _word_boundary_match(word: str, text: str) -> bool:
    return bool(re.search(rf"\b{re.escape(word)}\b", text, re.IGNORECASE))


def _classify(industry: str) -> dict | None:
    for cat in INDUSTRY_CATEGORIES:
        if any(_word_boundary_match(kw, industry) for kw in cat["keywords"]):
            return cat
    return None


def _generate_summary(cat: dict, rng: random.Random) -> str:
    pressure = rng.choice(cat["pressures"])
    template = rng.choice(SUMMARY_TEMPLATES)
    growth_pretty = {"high": "Strong", "moderate": "Moderate", "low": "Limited"}.get(cat["growth"], cat["growth"])
    return template.format(
        sector=cat["sector"],
        growth=cat["growth"],
        growth_cap=growth_pretty,
        grants=cat["grants"],
        pressure=pressure,
    )


def _generate_key_risks(cat: dict, rng: random.Random) -> list[str]:
    pool = cat["key_risks_pool"]
    count = rng.randint(3, min(5, len(pool)))
    return rng.sample(pool, count)


def _generate_outlook(cat: dict, rng: random.Random) -> str:
    base = rng.choice(cat["outlook"])
    if rng.random() < 0.4:
        suffix = rng.choice(OUTLOOK_SUFFIXES)
        return f"{base} {suffix}"
    return base


def analyze_industry(industry: str | None) -> dict | None:
    if not industry:
        return None

    cat = _classify(industry)
    if not cat:
        return generate_fallback(industry)

    seed = industry.strip().lower()
    rng = random.Random(seed)

    return {
        "sector": cat["sector"],
        "risk_level": cat["risk_level"],
        "summary": _generate_summary(cat, rng),
        "key_risks": _generate_key_risks(cat, rng),
        "outlook": _generate_outlook(cat, rng),
    }


FALLBACK_SECTORS = [
    "Commercial Services",
    "Trading & Distribution",
    "Professional Services",
    "General Business",
]

FALLBACK_RISK_LEVELS = ["Moderate", "Elevated"]

FALLBACK_RISKS_POOL = [
    "Limited industry-specific data available for detailed risk assessment",
    "General market cyclicality and economic sensitivity",
    "Dependence on key client relationships and revenue concentration",
    "Regulatory changes affecting the operating environment",
    "Competitive pressure from both incumbents and new entrants",
]

FALLBACK_OUTLOOKS = [
    "Sufficient data is not available for a sector-specific outlook. General economic conditions and company-specific factors should be weighed more heavily.",
    "Industry coverage is limited. A more detailed assessment would benefit from additional financial history and peer comparison data.",
]


def generate_fallback(industry: str) -> dict:
    seed = industry.strip().lower()
    rng = random.Random(seed)

    sector_guess = rng.choice(FALLBACK_SECTORS)
    if re.search(r"trade|import|export|distrib|wholesale|supply", industry, re.IGNORECASE):
        sector_guess = "Trading & Distribution"
    elif re.search(r"service|consult|advisory|legal|account|market", industry, re.IGNORECASE):
        sector_guess = "Professional Services"

    return {
        "sector": f"{sector_guess} — Unclassified",
        "risk_level": rng.choice(FALLBACK_RISK_LEVELS),
        "summary": f"The applicant operates in the {industry} space, which does not closely match a standard industry profile in our registry. {rng.choice(FALLBACK_RISKS_POOL)}.",
        "key_risks": rng.sample(FALLBACK_RISKS_POOL, 3),
        "outlook": rng.choice(FALLBACK_OUTLOOKS),
    }

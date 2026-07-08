# src/mock_data/industry_risks.py
# Mock AI industry analysis data keyed by SSIC code prefix or industry keyword.

INDUSTRY_RISKS = [
    {
        "keywords": ["software", "application", "development", "62011", "it", "technology", "information technology"],
        "sector": "Technology — Software & IT Services",
        "risk_level": "Moderate",
        "summary": "The Singapore software sector benefits from strong government digitalisation initiatives (Smart Nation, NDI) and sustained enterprise demand. However, the competitive talent market and rapid technology cycles create margin pressure.",
        "key_risks": [
            "Talent scarcity & rising salary costs for developers and engineers",
            "Short product lifecycles requiring continuous R&D investment",
            "Concentration risk if revenue depends on a few large clients",
            "Intellectual property protection and cybersecurity liability exposure",
        ],
        "outlook": "Stable — supported by public-sector digital spending and regional expansion opportunities in SEA.",
        "benchmarks": {
            "avg_revenue_growth": "12-18% YoY",
            "avg_ebitda_margin": "18-25%",
            "failure_rate_3yr": "8%",
        },
    },
    {
        "keywords": ["supermarket", "department", "retail", "store", "47112", "consumer"],
        "sector": "Retail — Supermarkets & Department Stores",
        "risk_level": "Moderate",
        "summary": "Singapore's retail sector is mature with intense competition from regional e-commerce platforms. Supermarkets benefit from necessity-driven demand, but department stores face structural challenges from changing consumer habits.",
        "key_risks": [
            "Thin margins driven by price competition with online platforms (Shopee, Amazon)",
            "High fixed rental costs in prime / centrally-located premises",
            "Workforce dependency on foreign labour with tightening quotas",
            "Inventory and perishable goods spoilage risk",
        ],
        "outlook": "Cautious — omnichannel transformation is necessary to remain competitive. Essential-goods retailers are more resilient than discretionary segments.",
        "benchmarks": {
            "avg_revenue_growth": "2-5% YoY",
            "avg_ebitda_margin": "5-10%",
            "failure_rate_3yr": "12%",
        },
    },
    {
        "keywords": ["freight", "forwarding", "logistics", "transport", "52291", "warehouse", "shipping"],
        "sector": "Logistics — Freight Forwarding & Warehousing",
        "risk_level": "Elevated",
        "summary": "Singapore's position as a global transshipment hub provides steady demand, but the freight forwarding segment is highly sensitive to global trade volumes, fuel costs, and geopolitical disruptions.",
        "key_risks": [
            "Exposure to global trade cycle — volumes decline during economic downturns",
            "Fuel price volatility directly impacting operating margins",
            "Geopolitical risks (Red Sea disruptions, US-China tariffs) affecting shipping routes",
            "High CAPEX requirements for fleet and warehouse infrastructure",
            "Regulatory compliance — customs, safety, and environmental standards",
        ],
        "outlook": "Cautious — near-term headwinds from global trade uncertainty. Medium-term supported by regional supply chain diversification (China+1).",
        "benchmarks": {
            "avg_revenue_growth": "5-10% YoY",
            "avg_ebitda_margin": "8-15%",
            "failure_rate_3yr": "15%",
        },
    },
    {
        "keywords": ["construction", "engineering", "building", "infrastructure", "real estate", "property"],
        "sector": "Construction & Engineering",
        "risk_level": "Elevated",
        "summary": "Singapore's construction sector is supported by a pipeline of public infrastructure projects (LTA, HDB, Changi T5). However, the sector faces acute labour shortages, rising material costs, and project delay risks.",
        "key_risks": [
            "Labour shortage and dependency on foreign workers with tightening quotas",
            "Rising raw material costs (steel, concrete, copper)",
            "Project delay and penalty risk from supply chain or regulatory issues",
            "High working capital requirements and progress-billing cash flow gaps",
            "Occupational safety and environmental compliance costs",
        ],
        "outlook": "Moderate — public-sector pipeline provides visibility. Private-sector demand is cyclical and sensitive to interest rates.",
        "benchmarks": {
            "avg_revenue_growth": "3-8% YoY",
            "avg_ebitda_margin": "5-12%",
            "failure_rate_3yr": "18%",
        },
    },
    {
        "keywords": ["food", "beverage", "f&b", "restaurant", "catering", "hotel", "hospitality"],
        "sector": "Food & Beverage / Hospitality",
        "risk_level": "High",
        "summary": "The F&B sector in Singapore is highly fragmented with intense competition. While essential dining demand is stable, discretionary F&B is sensitive to consumer sentiment, tourism flows, and manpower availability.",
        "key_risks": [
            "Very high failure rate — ~30% of new F&B outlets close within 2 years",
            "Extreme rental cost pressure in mall and prime street locations",
            "Labour shortage — reliance on foreign workers with tightening quotas",
            "Food safety compliance and licence risk",
            "Low switching cost for customers — high churn and brand fragility",
        ],
        "outlook": "Challenging — consolidation trend favours established chains over independents. Delivery-platform commission fees continue to pressure margins.",
        "benchmarks": {
            "avg_revenue_growth": "1-4% YoY",
            "avg_ebitda_margin": "3-10%",
            "failure_rate_3yr": "30%",
        },
    },
    {
        "keywords": ["manufacturing", "factory", "production", "industrial", "precision", "engineering"],
        "sector": "Manufacturing — General & Precision Engineering",
        "risk_level": "Moderate",
        "summary": "Singapore's manufacturing sector is driven by electronics, precision engineering, and chemicals. Government initiatives (Manufacturing 2030) and automation adoption support productivity, but global demand cycles remain a key variable.",
        "key_risks": [
            "Cyclical demand — sensitive to global semiconductor and electronics cycles",
            "Rising automation costs and need for continuous CAPEX to remain competitive",
            "Dependence on export markets and tariff/trade-policy shifts",
            "Energy cost sensitivity for heavy manufacturing processes",
        ],
        "outlook": "Stable — supported by the electronics upcycle and government Industry 4.0 grants. Labour-reliant subsegments face structural margin pressure.",
        "benchmarks": {
            "avg_revenue_growth": "4-10% YoY",
            "avg_ebitda_margin": "10-18%",
            "failure_rate_3yr": "10%",
        },
    },
]


def analyze_industry(industry: str | None) -> dict | None:
    """Return an industry analysis dict for the given industry string.
    Matches by keyword inclusion (case-insensitive). Returns None if no match."""
    if not industry:
        return None

    industry_lower = industry.lower()
    for entry in INDUSTRY_RISKS:
        if any(kw in industry_lower for kw in entry["keywords"]):
            return {k: v for k, v in entry.items() if k != "keywords"}
    return None

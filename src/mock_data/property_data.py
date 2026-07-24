# src/mock_data/property_data.py
# Mock property lookup for demo addresses.
# Maps registered addresses to coordinates and building/land owner info.

PROPERTY_RECORDS = [
    {
        "address": "1 Fusionopolis Way, #12-01, Connexis, Singapore 138632",
        "lat": 1.299640,
        "lng": 103.787690,
        "building_name": "Connexis @ Fusionopolis",
        "building_owner": "JTC Corporation",
        "property_type": "Commercial / Office (one-north)",
        "land_tenure": "99-year leasehold from 2005",
        "owner_info": "one-north infocomm & media hub — JTC Corporation is the master lessor. Grade A office space tenanted by technology and R&D firms."
    },
    {
        "address": "6 Bishan Street 13, #10-32, Singapore 579798",
        "lat": 1.3506,
        "lng": 103.8515,
        "building_name": "Bishan Street 13 Block 6",
        "building_owner": "Housing & Development Board (HDB)",
        "property_type": "Residential (HDB Flat)",
        "land_tenure": "99-year leasehold from 1992",
        "owner_info": "HDB leasehold flat. Individual unit is privately owned via leasehold title."
    },
    {
        "address": "6 Woodlands North 20, #16-32, Singapore 579798",
        "lat": 1.4517,
        "lng": 103.7920,
        "building_name": "Woodlands North 20 Block 6",
        "building_owner": "Housing & Development Board (HDB)",
        "property_type": "Residential (HDB Flat)",
        "land_tenure": "99-year leasehold from 1998",
        "owner_info": "HDB leasehold flat. Individual unit is privately owned via leasehold title."
    },
    {
        "address": "3 Tampines Central 1, #05-08, Singapore 529540",
        "lat": 1.3535,
        "lng": 103.9411,
        "building_name": "Tampines Central 1 Block 3",
        "building_owner": "Commercial Landlord (Private)",
        "property_type": "Commercial / Retail",
        "land_tenure": "99-year leasehold from 1995",
        "owner_info": "Privately-held commercial strata property. Mixed retail and office use."
    },
    {
        "address": "8 Changi South Lane, #02-01, Singapore 486113",
        "lat": 1.3245,
        "lng": 103.9625,
        "building_name": "Changi South Industrial Building",
        "building_owner": "JTC Corporation",
        "property_type": "Industrial (B2)",
        "land_tenure": "30-year leasehold from 2005",
        "owner_info": "JTC Corporation is the master lessor. Used for warehousing and logistics operations."
    },
    {
        "address": "6 Boon Lay Drive, #07-87, Singapore 640213",
        "lat": 1.3400,
        "lng": 103.7110,
        "building_name": "Boon Lay Drive Block 6",
        "building_owner": "Housing & Development Board (HDB)",
        "property_type": "Residential (HDB Flat)",
        "land_tenure": "99-year leasehold from 1996",
        "owner_info": "HDB leasehold flat. Individual unit is privately owned via leasehold title."
    },
    {
        "address": "1 Raffles Place, #20-01, Singapore 048616",
        "lat": 1.2841,
        "lng": 103.8512,
        "building_name": "One Raffles Place",
        "building_owner": "One Raffles Place Management Pte Ltd (Private)",
        "property_type": "Commercial / Office",
        "land_tenure": "99-year leasehold from 2000",
        "owner_info": "Privately-owned commercial strata office tower. One Raffles Place is a landmark Grade A office development in the heart of Singapore's CBD."
    },
    {
        "address": "1 Fusionopolis Way, Connexis, Singapore 138632",
        "lat": 1.299640,
        "lng": 103.787690,
        "building_name": "Connexis @ Fusionopolis",
        "building_owner": "JTC Corporation",
        "property_type": "Commercial / Office (one-north)",
        "land_tenure": "99-year leasehold from 2005",
        "owner_info": "one-north infocomm & media hub — JTC Corporation is the master lessor."
    },
]


def lookup_property(address: str) -> dict | None:
    """Find a property record by address (case-insensitive, trimmed match)."""
    if not address:
        return None
    needle = address.strip().lower()
    for rec in PROPERTY_RECORDS:
        if rec["address"].strip().lower() == needle:
            return dict(rec)
    return None

from fastapi import APIRouter, HTTPException, Query
from supabase import create_client
import os
from typing import List, Optional
from pydantic import BaseModel

# Import the parser
from app.utils.component_parser import ComponentParser

router = APIRouter()

# Initialize Supabase
url = os.getenv("MAIN_SUPABASE_URL")
key = os.getenv("MAIN_SUPABASE_KEY")

if not url or not key:
    raise ValueError("MAIN_SUPABASE_URL and MAIN_SUPABASE_KEY must be set in environment variables")

supabase = create_client(url, key)

class ComponentResponse(BaseModel):
    id: str
    name: str
    price: float
    image: str
    specs: dict
    category: str

# Mapping of frontend category names to DB tables
CATEGORY_TABLE_MAP = {
    "processors": "processors_prices",
    "motherboards": "motherboards_prices",
    "memory": "memory_prices",
    "graphic_cards": "graphic_cards_prices",
    "storage": "storage_prices", # This might need splitting if SSD/HDD are separate in UI but same table?
    "power_supply": "power_supply_units_prices", # Verify this table name from list
    "cases": "cases", # This one is tricky, check if there's a price table
    "monitors": "monitors_prices",
    "coolers": "cooling_prices",
    "keyboards": "peripherals_prices",
    "mice": "peripherals_prices",
    "headphones": "peripherals_prices",
    "headsets": "peripherals_prices",
    "speakers": "peripherals_prices",
    "printers": "printers_prices",
    "software": "os_software_prices",
    "os": "os_software_prices"
}

# Add fallback for some categories if needed
# Based on user list: 
# case_prices exists
# housing -> case_prices
# cooler -> cooling_prices

CATEGORY_TABLE_MAP.update({
    "cpu": "processors_prices",
    "mobo": "motherboards_prices",
    "ram": "memory_prices",
    "gpu": "graphic_cards_prices",
    "psu": "power_supply_units_prices",
    "case": "case_prices",
    "cooler": "cooling_prices",
    "ssd": "storage_prices",
    "hdd": "storage_prices",
    "printer": "printers_prices"
})

@router.get("/components/{category}", response_model=List[ComponentResponse])
def get_components(category: str, search: Optional[str] = None):
    category_lower = category.lower()
    table_name = CATEGORY_TABLE_MAP.get(category_lower)
    if not table_name:
        # Fallback: check if the table exists in the raw list provided by user
        # user list includes: cable_connector_prices, mouse, etc.
        # We'll just try to use the category name + "_prices" if not found
        if not table_name:
             table_name = f"{category}_prices"

    try:
        # Fetch data
        query = supabase.table(table_name).select("*")
        
        # Specific filtering for consolidated peripheral tables
        if table_name == "peripherals_prices":
            if category_lower in ["keyboards", "keyboard"]:
                query = query.ilike("component_name", "%keyboard%")
            elif category_lower in ["mice", "mouse"]:
                query = query.ilike("component_name", "%mouse%")
            elif category_lower in ["headphones", "headsets", "headset"]:
                query = query.or_("component_name.ilike.%headset%,component_name.ilike.%headphone%")
            elif category_lower in ["speakers", "speaker"]:
                query = query.ilike("component_name", "%speaker%")

        # Specific filtering for Storage (Split SSD vs HDD)
        if table_name == "storage_prices":
            if category_lower in ["ssd", "nvme", "m.2"]:
                # Filter for SSDs (keywords: SSD, NVMe, M.2)
                query = query.or_("component_name.ilike.%SSD%,component_name.ilike.%NVMe%,component_name.ilike.%M.2%")
            elif category_lower in ["hdd", "hard drive", "disk"]:
                # Filter for HDDs (Exclude SSD terms)
                # Supabase-py syntax for NOT is usually filter('col', 'not.ilike', val)
                # We chain filters to exclude all SSD keywords
                query = query.filter("component_name", "not.ilike", "%SSD%")\
                             .filter("component_name", "not.ilike", "%NVMe%")\
                             .filter("component_name", "not.ilike", "%M.2%")

        if search:
            query = query.ilike("component_name", f"%{search}%")
        
        # We need to limit because some tables are huge? Or just fetch all?
        # 200 items should be enough for a single fetch, maybe pagination later
        result = query.limit(500).execute()
        
        components = []
        for item in result.data:
            # Determine price (some have multiple columns like nanotek_price, etc.)
            # We'll pick the first available non-null price for now
            price = 0
            if item.get("nanotek_price"): price = item["nanotek_price"]
            elif item.get("computerzone_price"): price = item["computerzone_price"]
            elif item.get("pcbuilders_price"): price = item["pcbuilders_price"]
            
            # Skip items with no price? Or show as "Out of stock"? 
            # User wants "Real-time pricing", so assume 0 is bad.
            # But let's keep them so user sees inventory.
            
            name = item.get("component_name", "Unknown Component")
            
            # specs parsing
            specs = {}
            if category in ["processors", "cpu"]:
                specs = ComponentParser.parse_cpu(name)
            elif category in ["motherboards", "mobo"]:
                specs = ComponentParser.parse_motherboard(name)
            elif category in ["memory", "ram"]:
                specs = ComponentParser.parse_ram(name)
            elif category in ["storage", "ssd", "hdd"]:
                specs = ComponentParser.parse_storage(name)
            elif category in ["graphic_cards", "gpu", "graphics card"]:
                specs = ComponentParser.parse_gpu(name)
            elif category in ["power_supply", "psu", "power supply", "power_supply_units"]:
                specs = ComponentParser.parse_psu(name)
            elif category in ["cases", "case", "housing"]:
                specs = ComponentParser.parse_case(name)
            elif category in ["coolers", "cooler", "cpu cooler", "cooling"]:
                specs = ComponentParser.parse_cooler(name)
            elif category in ["printers", "printer"]:
                specs = ComponentParser.parse_printer(name)
            elif category in ["os", "software", "operating system"]:
                specs = ComponentParser.parse_os(name)
            
            # Map DB ID or generate one
            c_id = str(item.get("id", item.get("normalized_name", name)))

            components.append({
                "id": c_id,
                "name": name,
                "price": float(price) if price else 0.0,
                "image": specs.get("image", "https://via.placeholder.com/150"),
                "specs": specs,
                "category": category
            })
            
        # Specific sorting/filtering based on User Request
        
        # "In the Processors section, first require the user to choose a chipset: AMD or Intel. 
        # Once selected, display processors from the chosen chipset at the top..." -> Frontend Logic?
        # Backend should just return the data efficiently.
        
        return components

    except Exception as e:
        print(f"Error fetching {category}: {e}")
        # Return empty list to avoid crashing UI, or HTTP error
        # Returning empty to be safe
        return []

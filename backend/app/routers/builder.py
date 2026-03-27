from fastapi import APIRouter, HTTPException, Query  # type: ignore
from supabase import create_client  # type: ignore
import os
from typing import List, Optional
from pydantic import BaseModel  # type: ignore

# Import the parser
from app.utils.component_parser import ComponentParser  # type: ignore
from app.utils.image_vault import get_component_image  # type: ignore

router = APIRouter()

# Initialize Supabase
url = os.getenv("MAIN_SUPABASE_URL") or os.getenv("SUPABASE_URL")
key = os.getenv("MAIN_SUPABASE_KEY") or os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")

if not url or not key:
    raise ValueError("Supabase URL and Key (MAIN) must be set in environment variables")

supabase = create_client(url, key)

class ComponentResponse(BaseModel):
    id: str
    name: str
    price: float
    image: str
    specs: dict
    category: str

# Mapping of frontend category names to authoritative DB tables
CATEGORY_TABLE_MAP = {
    # Core _final tables
    "processors": "cpu_final",
    "cpu": "cpu_final",
    "motherboards": "motherboard_final",
    "motherboard": "motherboard_final",
    "mobo": "motherboard_final",
    "memory": "ram_final",
    "ram": "ram_final",
    "graphic_cards": "gpu_final",
    "gpu": "gpu_final",
    "graphics card": "gpu_final",
    "ssd": "ssd_final",
    "nvme": "ssd_final",
    "hdd": "hdd_final",
    "power_supply": "psu_final",
    "psu": "psu_final",
    "cases": "cases_final",
    "case": "cases_final",
    "coolers": "cpu_coolers_final",
    "cooler": "cpu_coolers_final",

    # Peripheral / Software tables (_prices tables)
    "monitors": "monitors_prices",
    "keyboards": "peripherals_prices",
    "mice": "peripherals_prices",
    "headphones": "peripherals_prices",
    "headsets": "peripherals_prices",
    "speakers": "peripherals_prices",
    "printers": "printers_prices",
    "printer": "printers_prices",
    "software": "os_software_prices",
    "os": "os_software_prices"
}

# The name/model column name varies across _final tables
SEARCH_COLUMN_MAP = {
    "cpu_final": "model",
    "gpu_final": "name",
    "ram_final": "name",
    "ssd_final": "final_model_name",
    "hdd_final": "name",
    "motherboard_final": "name",
    "psu_final": "final_model_name",
    "cases_final": "name",
    "cpu_coolers_final": "model_name"
}

# Real price columns to check, in order of priority (or we pick best)
PRICE_COLS = [
    "nanotek_price", "nanotek_price_lkr", "price_nanotek",
    "computerzone_price", "computerzone_price_lkr", "cz_price", "price_computerzone",
    "pc_builders_price", "pc_builders_price_lkr", "price_pcbuilders",
    "winsoft_price", "winsoft_price_lkr", "price_winsoft"
]

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
                # The hdd_final table is dedicated, no extra filters needed for now
                pass

        # Use the correct name column for this table
        name_col = SEARCH_COLUMN_MAP.get(table_name, "component_name")

        if search:
            query = query.ilike(name_col, f"%{search}%")
        
        result = query.limit(500).execute()
        
        components = []
        for item in result.data:
            # Determine "Real Price" - find the best available shop price
            prices = []
            for col in PRICE_COLS:
                val = item.get(col)
                if val:
                    try:
                        # Clean if string (e.g. "Rs. 10,000")
                        if isinstance(val, str):
                            import re
                            val = re.sub(r'[^0-9.]', '', val)
                        f_val = float(val)
                        if f_val > 0:
                            prices.append(f_val)
                    except:
                        pass
            
            # Pick min price if multiple, skip if no local price found
            if not prices:
                continue
            
            price = min(prices)
            
            name = item.get(name_col, item.get("component_name", "Unknown Component"))
            
            # specs parsing
            specs = {}
            if category_lower in ["processors", "cpu"]:
                specs = ComponentParser.parse_cpu(name)
            elif category_lower in ["motherboards", "motherboard", "mobo"]:
                specs = ComponentParser.parse_motherboard(name)
            elif category_lower in ["memory", "ram"]:
                specs = ComponentParser.parse_ram(name)
            elif category_lower in ["storage", "ssd", "hdd", "nvme"]:
                specs = ComponentParser.parse_storage(name)
            elif category_lower in ["graphic_cards", "gpu", "graphics card"]:
                specs = ComponentParser.parse_gpu(name)
            elif category_lower in ["power_supply", "psu", "power supply"]:
                specs = ComponentParser.parse_psu(name)
            elif category_lower in ["cases", "case", "housing"]:
                specs = ComponentParser.parse_case(name)
            elif category_lower in ["coolers", "cooler", "cpu cooler", "cooling"]:
                specs = ComponentParser.parse_cooler(name)
            elif category_lower in ["printers", "printer"]:
                specs = ComponentParser.parse_printer(name)
            elif category in ["os", "software", "operating system"]:
                specs = ComponentParser.parse_os(name)
            
            # Map DB ID or generate one
            c_id = str(item.get("id", item.get("normalized_name", name)))

            img_data = get_component_image(category, name)
            components.append({
                "id": c_id,
                "name": name,
                "price": float(price) if price else 0.0,
                "image": img_data["url"],
                "image_rotate": img_data["rotate"],
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

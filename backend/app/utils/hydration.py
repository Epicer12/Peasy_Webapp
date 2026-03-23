import os
from typing import List, Dict, Any
from app.utils.component_parser import ComponentParser
from app.utils.image_vault import get_component_image
import re

# Lazy Supabase initialization to avoid startup failures
_supabase = None

def get_supabase():
    global _supabase
    if _supabase is None:
        from supabase import create_client
        url = os.getenv("MAIN_SUPABASE_URL") or os.getenv("SUPABASE_URL")
        key = os.getenv("MAIN_SUPABASE_KEY") or os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")
        if url and key:
            _supabase = create_client(url, key)
    return _supabase

# Mapping of frontend category names to authoritative DB tables
HYDRATION_TABLE_MAP = {
    "cpu": "cpu_final",
    "processors": "cpu_final",
    "gpu": "gpu_final",
    "graphic_cards": "gpu_final",
    "graphics card": "gpu_final",
    "motherboard": "motherboard_final",
    "motherboards": "motherboard_final",
    "mobo": "motherboard_final",
    "ram": "ram_final",
    "memory": "ram_final",
    "ssd": "ssd_final",
    "nvme": "ssd_final",
    "hdd": "hdd_final",
    "psu": "psu_final",
    "power_supply": "psu_final",
    "case": "cases_final",
    "cases": "cases_final",
    "cooler": "cpu_coolers_final",
    "coolers": "cpu_coolers_final",
    
    # Peripherals
    "monitors": "monitors_prices",
    "keyboards": "peripherals_prices",
    "mice": "peripherals_prices",
    "headsets": "peripherals_prices",
    "speakers": "peripherals_prices",
    "os": "os_software_prices",
    "software": "os_software_prices"
}

# The name/model column name varies across _final tables
HYDRATION_COLUMN_MAP = {
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

# Shops price columns (copied from builder.py)
PRICE_COLS = [
    "nanotek_price", "nanotek_price_lkr", "price_nanotek",
    "computerzone_price", "computerzone_price_lkr", "cz_price", "price_computerzone",
    "pc_builders_price", "pc_builders_price_lkr", "price_pcbuilders",
    "winsoft_price", "winsoft_price_lkr", "price_winsoft"
]

def clean_price(val):
    if not val: return 0.0
    try:
        if isinstance(val, str):
            val = re.sub(r'[^0-9.]', '', val)
        return float(val)
    except:
        return 0.0

def get_best_price(item: Dict[str, Any]) -> float:
    prices = []
    for col in PRICE_COLS:
        val = item.get(col)
        p = clean_price(val)
        if p > 0:
            prices.append(p)
    return min(prices) if prices else 0.0

def hydrate_component(comp: Dict[str, Any]) -> Dict[str, Any]:
    """
    Takes a minimal component dict and enriches it with data from the master DB.
    """
    # Handle both {category, name} and {type, brand, model} conventions
    comp_type = comp.get("type") or comp.get("category")
    comp_name = comp.get("name") or (
        f"{comp['brand']} {comp['model']}" if comp.get("brand") and comp.get("model")
        else comp.get("model")
    )
    
    if not comp_type or not comp_name:
        return comp

    table_name = HYDRATION_TABLE_MAP.get(comp_type.lower())
    if not table_name:
        # Fallback to image vault if no table mapping
        if "image_url" not in comp:
            img_data = get_component_image(comp_type, comp_name)
            comp["image_url"] = img_data["url"]
            comp["image_rotate"] = img_data["rotate"]
        return comp

    name_col = HYDRATION_COLUMN_MAP.get(table_name, "component_name")
    
    try:
        db = get_supabase()
        if not db:
            return comp
        # Search for exact name match
        res = db.table(table_name).select("*").ilike(name_col, comp_name).limit(1).execute()
        
        if res.data:
            master_item = res.data[0]
            
            # Basic enrichment
            enriched = {**comp}
            
            # Specs parsing (if not already present or to ensure consistency)
            specs = comp.get("specs", {})
            if not specs:
                if table_name == "cpu_final": specs = ComponentParser.parse_cpu(comp_name)
                elif table_name == "motherboard_final": specs = ComponentParser.parse_motherboard(comp_name)
                elif table_name == "ram_final": specs = ComponentParser.parse_ram(comp_name)
                elif table_name == "ssd_final" or table_name == "hdd_final": specs = ComponentParser.parse_storage(comp_name)
                elif table_name == "gpu_final": specs = ComponentParser.parse_gpu(comp_name)
                elif table_name == "psu_final": specs = ComponentParser.parse_psu(comp_name)
                elif table_name == "cases_final": specs = ComponentParser.parse_case(comp_name)
                elif table_name == "cpu_coolers_final": specs = ComponentParser.parse_cooler(comp_name)
            
            enriched["specs"] = specs
            
            # Add all keys from master_item (useful for dynamic mapping in UI)
            # Filter out internal/redundant keys
            for k, v in master_item.items():
                if k not in ["id", "created_at", "updated_at"] and k not in enriched:
                    enriched[k] = v
            
            # Price logic
            if not enriched.get("price") or enriched.get("price") == 0:
                enriched["price"] = get_best_price(master_item)
            
            # Image logic
            if "image_url" not in enriched:
                img_data = get_component_image(comp_type, comp_name)
                enriched["image_url"] = img_data["url"]
                enriched["image_rotate"] = img_data["rotate"]
                
            return enriched
            
    except Exception as e:
        print(f"Hydration error for {comp_name} ({comp_type}): {e}")
        
    # Fallback enrichment - try to get image at least
    try:
        if "image_url" not in comp:
            img_data = get_component_image(comp_type, comp_name)
            comp["image_url"] = img_data["url"]
            comp["image_rotate"] = img_data["rotate"]
    except Exception:
        pass
        
    return comp

def hydrate_components(components: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    return [hydrate_component(c) for c in components]

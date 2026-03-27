from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(
    prefix="/components",
    tags=["components"],
    responses={404: {"description": "Not found"}},
)

_SUPABASE = None

def get_supabase():
    global _SUPABASE
    if _SUPABASE is None:
        url = os.getenv("MAIN_SUPABASE_URL") or os.getenv("SUPABASE_URL")
        key = os.getenv("MAIN_SUPABASE_KEY") or os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        if not url or not key:
            raise HTTPException(
                status_code=503,
                detail="Supabase credentials not configured (MAIN)",
            )
        _SUPABASE = create_client(url, key)
    return _SUPABASE

from app.utils.image_vault import get_component_image  # type: ignore
from app.utils.pricing import get_local_price  # type: ignore

import re

def parse_specs(item: dict, category: str) -> dict:
    specs = item.get("specs", {}) or {}
    name = str(item.get("name") or item.get("model") or item.get("component_name") or "").upper()
    
    if category == "cpu":
        specs["socket"] = item.get("cpu_socket") or specs.get("socket")
        specs["brand"] = item.get("brand") or ("Intel" if "INTEL" in name else "AMD" if "AMD" in name else None)
    elif category in ["mobo", "motherboard"]:
        specs["socket"] = item.get("socket") or specs.get("socket")
        specs["form_factor"] = item.get("form_factor") or specs.get("form_factor")
    elif category == "psu":
        wattage = item.get("wattage")
        if not wattage:
            match = re.search(r'(\d{3,4})\s?W', name)
            if match: wattage = match.group(1)
        specs["wattage"] = wattage
    elif category == "case":
        specs["mobo_support"] = item.get("motherboard_support")
        specs["gpu_clearance"] = item.get("supported_gpu_length_mm")
    
    return specs

@router.get("/search")
async def search_components(
    type: str = Query(..., description="Component type e.g. CPU, GPU"),
    q: Optional[str] = Query(None, description="Search query")
):
    supabase = get_supabase()
    
    # Map frontend types to backend table names
    table_map = {
        "cpu": "cpu_final",
        "mobo": "motherboard_final",
        "motherboard": "motherboard_final",
        "ram": "ram_final",
        "ssd": "ssd_final",
        "hdd": "hdd_final",
        "gpu": "gpu_final",
        "psu": "psu_final",
        "case": "cases_final",
        "cooler": "cpu_coolers_final",
        "case_fans": "case_fans_final",
        "software": "os_software_prices",
        "os": "os_software_prices",
        "mice": "peripherals_prices",
        "headsets": "peripherals_prices",
        "keyboards": "peripherals_prices",
        "speakers": "peripherals_prices",
        "monitors": "monitors_prices",
        "consoles": "console_handheld_gaming_prices",
        "expansion": "expansion_cards_networking_prices",
        "connector": "cable_connector_prices",
        "converter": "cable_converter_prices",
        "party": "party_box_pricing"
    }
    
    t_lower = type.lower()
    table_name = table_map.get(t_lower)
    
    if not table_name:
        print(f"Unknown component type: {type}")
        return []
        
    try:
        # Determine the search column based on table
        search_col = "name"
        if table_name == "cpu_final": search_col = "model"
        elif table_name == "cpu_coolers_final": search_col = "model_name"
        elif "prices" in table_name or "pricing" in table_name: search_col = "component_name"

        # Start building the query
        query = supabase.table(table_name).select("*")
        
        # Apply special category filters (Migrated from frontend)
        if t_lower == 'keyboards':
            query = query.ilike(search_col, '%keyboard%')
        elif t_lower == 'mice':
            query = query.ilike(search_col, '%mouse%')
        elif t_lower == 'headsets':
            query = query.or_(f"{search_col}.ilike.%headset%,{search_col}.ilike.%headphone%")
        elif t_lower == 'speakers':
            query = query.ilike(search_col, '%speaker%')
        elif t_lower == 'consoles':
            query = query.or_(f"{search_col}.ilike.%console%,{search_col}.ilike.%ps5%,{search_col}.ilike.%xbox%,{search_col}.ilike.%nintendo%,{search_col}.ilike.%switch%")

        # Add generic search query
        if q and q.strip():
            query = query.ilike(search_col, f"%{q}%")
            
        # Execute query
        if table_name == "cpu_final":
            query = query.order("cpu_mark", desc=True)
        elif table_name == "gpu_final":
            query = query.order("g3_dmark", desc=True)
        elif table_name == "ram_final":
            query = query.order("read_speed_mb_s", desc=True)
        elif table_name == "ssd_final":
            query = query.order("benchmark_score", desc=True)
        elif table_name in ["motherboard_final", "cases_final", "psu_final", "cpu_coolers_final"]:
             # Higher estimated price usually correlates with higher tier if benchmarks missing
            price_col = "estimated_price" if table_name == "motherboard_final" else "estimated_price_lkr"
            query = query.order(price_col, desc=True)
            
        response = query.limit(100).execute()
        raw_data = response.data or []

        # Handle Speakers special case (union with party_box_pricing)
        if t_lower == 'speakers':
            pb_query = supabase.table("party_box_pricing").select("*")
            if q and q.strip():
                pb_query = pb_query.ilike("component_name", f"%{q}%")
            pb_res = pb_query.limit(50).execute()
            raw_data.extend(pb_res.data or [])

        processed_results = []
        for item in raw_data:
            local_price = get_local_price(item)
            if local_price <= 0:
                continue
            
            item_name = item.get(search_col) or item.get("name") or "Component"
            img_data = get_component_image(type, item_name)
            
            processed_item = {
                **item,
                "id": item.get("id"),
                "name": item_name,
                "price": local_price,
                "image_url": img_data["url"],
                "image_rotate": img_data["rotate"],
                "image": img_data["url"], # Optional legacy fallback
                "specs": parse_specs(item, t_lower)
            }
            processed_results.append(processed_item)
            
        return processed_results
        
    except Exception as e:
        print(f"Search error on table {table_name}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

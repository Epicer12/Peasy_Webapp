from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional, Dict, Any
import os
from supabase import create_client
from dotenv import load_dotenv
import asyncio
import re
from app.utils.image_vault import get_component_image
from concurrent.futures import ThreadPoolExecutor

load_dotenv()

router = APIRouter(
    prefix="/marketplace",
    tags=["marketplace"],
    responses={404: {"description": "Not found"}},
)

_SUPABASE = None

def get_supabase():
    global _SUPABASE
    if _SUPABASE is None:
        url = os.getenv("MAIN_SUPABASE_URL")
        key = os.getenv("MAIN_SUPABASE_KEY")
        if not url or not key:
            raise HTTPException(
                status_code=503,
                detail="Supabase credentials not configured",
            )
        _SUPABASE = create_client(url, key)
    return _SUPABASE

TABLE_MAP = {
    "gpu": "gpu_final",
    "cpu": "cpu_final",
    "mobo": "motherboard_final",
    "ram": "ram_final",
    "ssd": "ssd_final",
    "hdd": "hdd_final",
    "psu": "psu_final",
    "case": "cases_final",
    "cooler": "cpu_coolers_final"
}

KNOWN_SHOPS = [
    {"id": "nanotek", "name": "Nanotek"},
    {"id": "redline", "name": "Redline"},
    {"id": "barclays", "name": "Barclays"},
    {"id": "chroma", "name": "Chroma"},
    {"id": "sense", "name": "Sense"},
    {"id": "techzone", "name": "Techzone"},
    {"id": "computerzone", "name": "Computerzone"},
    {"id": "winsoft", "name": "Winsoft"}
]

# Authoritative list of local price columns — mirrors builder.py exactly, no estimated fallbacks
PRICE_COLS = [
    "nanotek_price", "nanotek_price_lkr", "price_nanotek",
    "computerzone_price", "computerzone_price_lkr", "cz_price", "price_computerzone",
    "pc_builders_price", "pc_builders_price_lkr", "price_pcbuilders",
    "winsoft_price", "winsoft_price_lkr", "price_winsoft"
]

# Per-table name column — mirrors SEARCH_COLUMN_MAP in builder.py
NAME_COL_MAP = {
    "cpu_final": "model",
    "gpu_final": "name",
    "ram_final": "name",
    "ssd_final": "final_model_name",
    "hdd_final": "name",
    "motherboard_final": "name",
    "psu_final": "final_model_name",
    "cases_final": "name",
    "cpu_coolers_final": "model_name",
}



# Reverse map: table name -> category key (used to derive item_type)
_TABLE_TO_CAT = {v: k for k, v in TABLE_MAP.items()}

def standardize_product(item: dict, table_name: str, requested_shop: Optional[str]) -> Optional[dict]:
    """Standardize the product dictionary mapping specific shopX_price columns."""
    
    # Ensure fallback ID
    if "id" not in item:
        item["id"] = item.get("name", "unknown_id")
        
    # Use the reverse TABLE_MAP lookup so `cpu_coolers_final` -> `cooler`, `cases_final` -> `case`
    item_type = _TABLE_TO_CAT.get(table_name, table_name.replace("_final", ""))
    
    # Use the per-table name column (some tables use final_model_name or model_name, not 'name')
    name_col = NAME_COL_MAP.get(table_name, "name")
    name = item.get(name_col) or item.get("name") or item.get("component_name") or "Unknown Component"

    # Per-table brand extraction:
    # cpu_coolers_final has a 'producer' column; ssd_final and psu_final have no brand column.
    if table_name == "cpu_coolers_final":
        brand = item.get("producer") or name.split()[0]
    else:
        brand = item.get("brand") or name.split()[0] if name else "Unknown"

    available_shops = []
    prices = []
    
    # Authoritative scanning for local shop pricing
    for col in PRICE_COLS:
        value = item.get(col)
        if value is not None:
            # Determine shop prefix for the frontend mapping
            shop_prefix = "unknown"
            if "nanotek" in col: shop_prefix = "nanotek"
            elif "computerzone" in col or "cz_" in col: shop_prefix = "computerzone"
            elif "pc_builders" in col or "pcbuilders" in col: shop_prefix = "pcbuilders"
            elif "winsoft" in col: shop_prefix = "winsoft"
            # Add other vendors as needed for the frontend prefixes
                
            try:
                price_float = float(str(value).replace(',', '').replace('Rs.', '').replace('LKR', '').strip() or 0)
                if price_float > 0:
                    if shop_prefix not in available_shops:
                        available_shops.append(shop_prefix)
                    prices.append((shop_prefix, price_float))
            except ValueError:
                pass

                
    if not prices:
        return None  # Discard if out of stock everywhere and has no valid price
        
    actual_price = 0.0
    
    if requested_shop and requested_shop != "all":
        if requested_shop not in available_shops:
            return None # Discard if this item is not sold at the requested shop
        # Locate the exact price for the requested shop
        actual_price = next((p for s, p in prices if s == requested_shop), 0.0)
    else:
        # Lowest available price across all shops if viewing aggregated "All Shops" catalog
        actual_price = min(p for _, p in prices)
            
    img_data = get_component_image(item_type, name)
    
    return {
        "id": item.get("id"),
        "name": name,
        "type": item_type,
        "brand": brand,
        "actual_price": actual_price,
        "available_shops": available_shops,
        "specs": item.get("specs", item.get("specifications")),
        "status": item.get("status", "In Stock"),
        "image_url": img_data["url"],
        "image_rotate": img_data["rotate"]
    }

def fetch_table_data_sync(supabase, table_name: str, q: Optional[str], min_price: Optional[float], max_price: Optional[float], shop: Optional[str]):
    """Synchronous helper to fetch and filter data strictly enforcing actual_price logic."""
    try:
        query = supabase.table(table_name).select("*")
        
        # db level search
        if q and q.strip():
            query = query.ilike("name", f"%{q.strip()}%")
            
        response = query.execute()
        
        results = []
        for item in response.data:
            standardized = standardize_product(item, table_name, shop)
            if not standardized:
                continue # Skip if out of stock or failed mapping
                
            p = standardized["actual_price"]
            if min_price is not None and p < min_price: continue
            if max_price is not None and p > max_price: continue
            
            results.append(standardized)
            
        return table_name, results
    except Exception as e:
        print(f"Error querying {table_name}: {e}")
        return table_name, []

@router.get("/shops")
async def get_shops():
    """Returns the static mapping of vendor prefixes to names for frontend filtering."""
    return KNOWN_SHOPS

@router.get("/search")
async def search_marketplace(
    category: str = Query("all", description="Category ID from frontend tabs"),
    shop: str = Query("all", description="Specific Vendor Shop Prefix (e.g. shop1) or 'all'"),
    q: Optional[str] = Query(None, description="Search query"),
    min_price: Optional[float] = Query(None, description="Minimum price"),
    max_price: Optional[float] = Query(None, description="Maximum price")
):
    supabase = get_supabase()
    
    tables_to_query = []
    if category in TABLE_MAP:
        tables_to_query = [TABLE_MAP[category]]
    elif category == "all":
        tables_to_query = list(TABLE_MAP.values())
    else:
        raise HTTPException(status_code=400, detail="Invalid category")
        
    loop = asyncio.get_running_loop()
    with ThreadPoolExecutor() as pool:
        tasks = [
            loop.run_in_executor(pool, fetch_table_data_sync, supabase, t, q, min_price, max_price, shop)
            for t in tables_to_query
        ]
        results = await asyncio.gather(*tasks)
    
    final_output = {}
    for table_name, items in results:
        # Un-map the table name back to the base category string for the frontend
        cat_key = next((k for k, v in TABLE_MAP.items() if v == table_name), table_name.replace("_final", ""))
        final_output[cat_key] = items
        
    return final_output

@router.get("/offers")
async def get_curated_offers():
    return [
        { 
            "id": 101, "type": "gpu", "name": "NVIDIA GeForce RTX 4090 FE", 
            "actual_price": 850000, "offer_price": 790000, "discount_percentage": 7, 
            "brand": "NVIDIA", "image_url": "https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&q=80&w=400" 
        },
        { 
            "id": 102, "type": "cpu", "name": "AMD Ryzen 9 7950X3D", 
            "actual_price": 250000, "offer_price": 210000, "discount_percentage": 16, 
            "brand": "AMD", "image_url": "https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?auto=format&fit=crop&q=80&w=400" 
        }
    ]

@router.get("/component/{component_id}")
async def get_component(
    component_id: str, 
    category: str = Query(..., description="Category (like 'gpu', 'cpu') needed to target the correct table"),
    shop: str = Query("all", description="Vendor shop prefix constraint")
):
    """
    Retrieves a single component's detailed JSON payload natively from Supabase using its ID.
    Perfectly structures the payload for the frontend interactive Popup Modal.
    """
    supabase = get_supabase()
    
    if category not in TABLE_MAP:
        raise HTTPException(status_code=400, detail="Invalid category requested")
        
    table_name = TABLE_MAP[category]
    
    try:
        # Supabase `.single()` returns exactly one row or throws Exception if not found
        response = supabase.table(table_name).select("*").eq("id", component_id).single().execute()
        item = response.data
        if not item:
            raise HTTPException(status_code=404, detail="Component not found in Supabase")
            
        standardized = standardize_product(item, table_name, shop)
        if not standardized:
            raise HTTPException(status_code=404, detail="Component pricing unavailable for exact shop specification")
            
        return standardized
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


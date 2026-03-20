from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional, Dict, Any
import os
from supabase import create_client
from dotenv import load_dotenv
import asyncio
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
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        if not url or not key:
            raise HTTPException(
                status_code=503,
                detail="Supabase credentials not configured",
            )
        _SUPABASE = create_client(url, key)
    return _SUPABASE

TABLE_MAP = {
    "gpu": "gpu",
    "cpu": "cpu",
    "mobo": "motherboard",
    "ram": "ram",
    "ssd": "ssd",
    "hdd": "hdd",
    "psu": "psu",
    "case": "case",
    "cooler": "cooler"
}

def standardize_product(item: dict, table_name: str) -> dict:
    """Standardize the product dictionary to ensure consistent fields for the frontend."""
    # Ensure standard schema: id, type, name, price, brand, image_url
    item["type"] = table_name
    
    # Try to extract a brand if missing
    if "brand" not in item:
        name = item.get("name", "")
        item["brand"] = name.split()[0] if name else "Unknown"
        
    # Ensure float price
    if "price" in item and item["price"]:
        try:
            item["price"] = float(item["price"])
        except ValueError:
            item["price"] = 0.0
    else:
        item["price"] = 0.0
        
    return item

def fetch_table_data_sync(supabase, table_name: str, q: Optional[str], min_price: Optional[float], max_price: Optional[float]):
    """Synchronous helper to fetch and filter data from a single Supabase table."""
    try:
        query = supabase.table(table_name).select("*")
        
        # db level search
        if q and q.strip():
            query = query.ilike("name", f"%{q.strip()}%")
            
        response = query.limit(50).execute()
        
        results = []
        for item in response.data:
            price_val = 0.0
            if "price" in item and item["price"]:
                try:
                    price_val = float(item["price"])
                except ValueError:
                    pass
            
            if min_price is not None and price_val < min_price: continue
            if max_price is not None and price_val > max_price: continue
            
            # exclude items with zero price UNLESS bounds are specifically None
            if price_val > 0 or (min_price is None and max_price is None):
                results.append(standardize_product(item, table_name))
            
        return table_name, results
    except Exception as e:
        print(f"Error querying {table_name}: {e}")
        return table_name, []

@router.get("/search")
async def search_marketplace(
    category: str = Query("all", description="Category ID from frontend tabs"),
    q: Optional[str] = Query(None, description="Search query"),
    min_price: Optional[float] = Query(None, description="Minimum price"),
    max_price: Optional[float] = Query(None, description="Maximum price")
):
    supabase = get_supabase()
    
    tables_to_query = []
    if category in TABLE_MAP:
        tables_to_query = [TABLE_MAP[category]]
    elif category == "all":
        tables_to_query = ["gpu", "cpu", "motherboard", "ram", "ssd"]
    else:
        raise HTTPException(status_code=400, detail="Invalid category")
        
    # Run sync supabase queries in a ThreadPoolExecutor to remain non-blocking
    loop = asyncio.get_running_loop()
    with ThreadPoolExecutor() as pool:
        tasks = [
            loop.run_in_executor(pool, fetch_table_data_sync, supabase, t, q, min_price, max_price)
            for t in tables_to_query
        ]
        results = await asyncio.gather(*tasks)
    
    # Format category dictionary
    final_output = {}
    for table_name, items in results:
        cat_key = next((k for k, v in TABLE_MAP.items() if v == table_name), table_name)
        final_output[cat_key] = items
        
    return final_output

@router.get("/offers")
async def get_curated_offers():
    return [
        { 
            "id": 101, "type": "gpu", "name": "NVIDIA GeForce RTX 4090 FE", 
            "price": 850000, "offer_price": 790000, "discount_percentage": 7, 
            "brand": "NVIDIA", "image_url": "https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&q=80&w=400" 
        },
        { 
            "id": 102, "type": "cpu", "name": "AMD Ryzen 9 7950X3D", 
            "price": 250000, "offer_price": 210000, "discount_percentage": 16, 
            "brand": "AMD", "image_url": "https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?auto=format&fit=crop&q=80&w=400" 
        }
    ]


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
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        if not url or not key:
            raise HTTPException(
                status_code=503,
                detail="Supabase credentials not configured",
            )
        _SUPABASE = create_client(url, key)
    return _SUPABASE

@router.get("/search")
async def search_components(
    type: str = Query(..., description="Component type e.g. CPU, GPU"),
    q: Optional[str] = Query(None, description="Search query")
):
    supabase = get_supabase()
    
    # Map frontend types to backend table names
    # Frontend: "CPU", "GPU", "RAM", "Storage", "PSU", "Case" (from BuildPage.jsx)
    table_map = {
        "cpu": "cpu",
        "mobo": "motherboard",
        "ram": "ram",
        "ssd": "ssd",
        "hdd": "hdd",
        "gpu": "gpu",
        "psu": "psu",
        "case": "case",
        "cooler": "cooler",
        "os": "os",
        "monitors": "monitors",
        "keyboards": "keyboards",
        "mice": "mice",
        # New Enpoint Mappings (keep these since Frontend sidebar references them)
        "all_in_one": "all_in_one_systems_prices",
        "desktop": "desktop_pcs_prices",
        "system": "desktop_systems_prices",
        "expansion": "expansion_cards_networking_prices",
        "connector": "cable_connector_prices",
        "converter": "cable_converter_prices",
        "console": "console_handheld_gaming_prices",
        "party": "party_box_pricing"
    }
    
    table_name = table_map.get(type.lower())
    
    if not table_name:
        print(f"Unknown component type: {type}")
        return []
        
    try:
        # Start building the query on the specific table
        query = supabase.table(table_name).select("*")
        
        # Add search filter (partial match on name, case-insensitive)
        if q and q.strip():
            query = query.ilike("name", f"%{q}%")
            
        # Execute query with a limit
        response = query.limit(50).execute()
        
        return response.data
        
    except Exception as e:
        print(f"Search error on table {table_name}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

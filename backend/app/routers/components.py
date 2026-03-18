from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
import os
from supabase import create_client

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
        "gpu": "gpu",
        "ram": "ram",
        "storage": "storage_devices",
        "psu": "power_supplies",
        "case": "cases"
    }
    
    table_name = table_map.get(type.lower())
    
    if not table_name:
        # Fallback or error if type is unknown
        # For now, if we can't map it, we might return empty or try a generic approach
        print(f"Unknown component type: {type}")
        return []
        
    try:
        # Start building the query on the specific table
        query = supabase.table(table_name).select("*")
        
        # Add search filter (partial match on name, case-insensitive)
        # Only apply if q is provided and not empty
        if q and q.strip():
            query = query.ilike("name", f"%{q}%")
            
        # Execute query with a limit
        response = query.limit(50).execute()
        
        # Standardize output for frontend
        return response.data
        
    except Exception as e:
        print(f"Search error on table {table_name}: {e}")
        # If 'name' column doesn't exist, we might get an error. 
        raise HTTPException(status_code=500, detail=str(e))

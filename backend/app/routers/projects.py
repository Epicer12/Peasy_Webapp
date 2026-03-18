from fastapi import APIRouter, HTTPException, Body
from supabase import create_client
import os
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

router = APIRouter(prefix="/api/projects", tags=["projects"])

# Initialize Supabase
# Initialize Supabase
url = os.getenv("MAIN_SUPABASE_URL") or os.getenv("SUPABASE_URL")
key = os.getenv("MAIN_SUPABASE_KEY") or os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")
if not url or not key:
    print("Warning: Supabase credentials not found in projects.py")
supabase = create_client(url, key)

class ProjectCreate(BaseModel):
    user_id: Optional[str] = "00000000-0000-0000-0000-000000000000"
    user_email: Optional[str] = None
    name: str
    description: Optional[str] = None
    total_price: float
    components: List[dict]
    status: str = "Planned"
    progress: int = 0

@router.post("")
def save_project(project: ProjectCreate):
    try:
        # Pydantic model to dict
        data = project.dict()
        # Supabase insert
        res = supabase.table("user_projects").insert(data).execute()
        return {"success": True, "project": res.data[0]}
    except Exception as e:
        print(f"Error saving project: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("")
def get_projects(user_email: Optional[str] = None):
    try:
        query = supabase.table("user_projects").select("*").order("created_at", desc=True)
        if user_email:
            query = query.eq("user_email", user_email)
            
        res = query.execute()
        return res.data
    except Exception as e:
        print(f"Error fetching projects: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{project_id}")
def delete_project(project_id: str):
    try:
        supabase.table("user_projects").delete().eq("id", project_id).execute()
        return {"success": True}
    except Exception as e:
        print(f"Error deleting project: {e}")
        raise HTTPException(status_code=500, detail=str(e))

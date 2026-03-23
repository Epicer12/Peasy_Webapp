from fastapi import APIRouter, HTTPException, Body  # type: ignore
from supabase import create_client  # type: ignore
import os
from typing import List, Optional
from pydantic import BaseModel  # type: ignore
from datetime import datetime

router = APIRouter(prefix="/projects", tags=["projects"])

# Initialize Supabase
url = os.getenv("MAIN_SUPABASE_URL") or os.getenv("SUPABASE_URL")
# Prefer service role key for backend operations to bypass RLS if needed, but allow fallback
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("MAIN_SUPABASE_KEY") or os.getenv("SUPABASE_KEY")

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
    image_url: Optional[str] = None

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

from app.utils.image_vault import get_component_image  # type: ignore

@router.get("")
def get_projects(user_email: str):
    try:
        # Require user_email to ensure users only see their own builds
        res = supabase.table("user_projects").select("*") \
            .eq("user_email", user_email) \
            .order("created_at", desc=True) \
            .execute()
        
        projects = res.data
        for p in projects:
            components_list = p.get("components") or []
            for comp in components_list:
                if "image_url" not in comp:
                    img_data = get_component_image(comp.get("type", ""), comp.get("name", ""))
                    comp["image_url"] = img_data["url"]
                    comp["image_rotate"] = img_data["rotate"]
                    
        return projects
    except Exception as e:
        print(f"Error fetching projects: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{project_id}")
def get_project(project_id: str, user_email: Optional[str] = None):
    try:
        query = supabase.table("user_projects").select("*").eq("id", project_id)
        if user_email:
            query = query.eq("user_email", user_email)
            
        res = query.execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Project not found or access denied")
            
        project = res.data[0]
        # Inject images into components if not present
        components_list = project.get("components") or []
        for comp in components_list:
            if "image_url" not in comp:
                img_data = get_component_image(comp.get("type", ""), comp.get("name", ""))
                comp["image_url"] = img_data["url"]
                comp["image_rotate"] = img_data["rotate"]
                
        return project
    except Exception as e:
        print(f"Error fetching project: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{project_id}")
def update_project(project_id: str, project: ProjectCreate):
    try:
        # First verify ownership before updating
        check = supabase.table("user_projects").select("user_email").eq("id", project_id).execute()
        if not check.data:
            raise HTTPException(status_code=404, detail="Project not found")
        
        if project.user_email and check.data[0]["user_email"] != project.user_email:
            raise HTTPException(status_code=403, detail="Unauthorized to update this project")

        data = project.dict(exclude_unset=True)
        res = supabase.table("user_projects").update(data).eq("id", project_id).execute()
        return {"success": True, "project": res.data[0]}
    except Exception as e:
        print(f"Error updating project: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{project_id}")
def delete_project(project_id: str, user_email: str):
    try:
        # Delete only if project belongs to user
        res = supabase.table("user_projects").delete() \
            .eq("id", project_id) \
            .eq("user_email", user_email) \
            .execute()
        
        if not res.data:
             raise HTTPException(status_code=403, detail="Unauthorized or project not found")
             
        return {"success": True}
    except Exception as e:
        print(f"Error deleting project: {e}")
        raise HTTPException(status_code=500, detail=str(e))

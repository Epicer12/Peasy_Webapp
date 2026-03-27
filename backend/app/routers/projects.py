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
    assembly_guide: Optional[list] = None

@router.post("")
def save_project(project: ProjectCreate):
    try:
        # Extract guide content before removing it from main data
        guide_content = project.assembly_guide

        # Pydantic model to dict, drop unset to avoid sending unintended nulls
        data = project.dict(exclude_unset=True)
        data.pop('assembly_guide', None)
        
        # Supabase insert project
        res = supabase.table("user_projects").insert(data).execute()
        new_project = res.data[0]

        # Insert assembly guide if passed
        if guide_content:
            guide_data = {
                "build_id": new_project["id"],
                "user_email": project.user_email or "anonymous@peasy.com",
                "guide_content": guide_content
            }
            supabase.table("assembly_guides").insert(guide_data).execute()

        return {"success": True, "project": new_project}
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

class ProjectUpdate(BaseModel):
    user_email: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    total_price: Optional[float] = None
    components: Optional[List[dict]] = None
    status: Optional[str] = None
    progress: Optional[int] = None
    assembly_guide: Optional[list] = None

@router.put("/{project_id}")
def update_project(project_id: str, project: ProjectUpdate):
    try:
        # First verify ownership before updating
        check = supabase.table("user_projects").select("user_email").eq("id", project_id).execute()
        if not check.data:
            raise HTTPException(status_code=404, detail="Project not found")
        
        if project.user_email and check.data[0]["user_email"] != project.user_email:
            raise HTTPException(status_code=403, detail="Unauthorized to update this project")

        data = project.dict(exclude_unset=True)
        guide_content = data.pop('assembly_guide', None)

        res = supabase.table("user_projects").update(data).eq("id", project_id).execute()
        updated_project = res.data[0]

        if guide_content is not None:
            # Upsert the guide content - check if it exists first
            guide_check = supabase.table("assembly_guides").select("id").eq("build_id", project_id).execute()
            
            guide_data = {
                "build_id": project_id,
                "user_email": check.data[0]["user_email"],
                "guide_content": guide_content
            }

            if guide_check.data:
                supabase.table("assembly_guides").update({"guide_content": guide_content}).eq("build_id", project_id).execute()
            else:
                supabase.table("assembly_guides").insert(guide_data).execute()

        return {"success": True, "project": updated_project}
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

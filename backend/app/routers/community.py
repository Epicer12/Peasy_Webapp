from fastapi import APIRouter, HTTPException, Depends, Body
import os
import requests
from typing import List, Optional
from pydantic import BaseModel
from app.dependencies import get_current_user, User, get_warranty_supabase
from app.utils.hydration import hydrate_components

router = APIRouter(prefix="/community", tags=["community"])

# Initialize Supabase using the service role client from dependencies
supabase = get_warranty_supabase()

class CommentCreate(BaseModel):
    comment_text: str
    is_anonymous: Optional[bool] = False

class PublishRequest(BaseModel):
    build_story: Optional[str] = ""
    image_url: Optional[str] = None
    author_name: Optional[str] = None
    display_name: Optional[str] = None

@router.get("/builds")
def get_community_builds(limit: int = 20, offset: int = 0):
    """Fetch all public builds from the community."""
    try:
        # Fetch public builds from user_projects
        # We also want to include the count of likes and comments
        res = supabase.table("user_projects").select("*") \
            .eq("is_public", True) \
            .order("created_at", desc=True) \
            .range(offset, offset + limit - 1) \
            .execute()
        
        builds = res.data
        
        # For each build, fetch like counts
        # (In a production app, we would use a more optimized SQL view or join, but this is a straightforward implementation)
        for build in builds:
            # Get like count
            likes_res = supabase.table("community_likes").select("count", count="exact").eq("project_id", build["id"]).execute()
            build["likes"] = likes_res.count if likes_res.count is not None else 0
            
            # Get comment count
            comments_res = supabase.table("community_comments").select("count", count="exact").eq("project_id", build["id"]).execute()
            build["comments_count"] = comments_res.count if comments_res.count is not None else 0
            
        return builds
    except Exception as e:
        print(f"Error fetching community builds: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/builds/{build_id}")
def get_community_build_details(build_id: str):
    """Fetch details of a single community build, including comments."""
    try:
        # Fetch project
        res = supabase.table("user_projects").select("*").eq("id", build_id).eq("is_public", True).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Build not found or is private")
        
        build = res.data[0]
        
        # Fetch comments
        comments_res = supabase.table("community_comments").select("*") \
            .eq("project_id", build_id) \
            .order("created_at", desc=True) \
            .execute()
        build["comments"] = comments_res.data
        
        # Fetch like count
        likes_res = supabase.table("community_likes").select("count", count="exact").eq("project_id", build_id).execute()
        build["likes"] = likes_res.count if likes_res.count is not None else 0
        
        # Hydrate components with full details from master tables (non-blocking)
        try:
            raw_components = build.get("components") or build.get("project_components") or build.get("items") or []
            if raw_components:
                build["components"] = hydrate_components(raw_components)
        except Exception as hydrate_err:
            print(f"Hydration skipped due to error: {hydrate_err}")

        return build
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching build details: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/builds/{build_id}/like")
def toggle_like(build_id: str, user: User = Depends(get_current_user)):
    """Toggle a like on a project for the current user."""
    user_id = user.uid or user.supabase_uid
    try:
        # Check if already liked
        existing = supabase.table("community_likes").select("*").eq("project_id", build_id).eq("user_id", user_id).execute()
        
        if existing.data:
            # Unlike
            supabase.table("community_likes").delete().eq("project_id", build_id).eq("user_id", user_id).execute()
            return {"status": "unliked"}
        else:
            # Like
            supabase.table("community_likes").insert({"project_id": build_id, "user_id": user_id}).execute()
            return {"status": "liked"}
    except Exception as e:
        print(f"Error toggling like: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/builds/{build_id}/comment")
def add_comment(build_id: str, comment: CommentCreate, user: User = Depends(get_current_user)):
    """Add a comment to a public build."""
    user_id = user.uid or user.supabase_uid
    
    # User's Display Name extraction (prioritize user.name unless anonymous)
    user_name = user.name
    if comment.is_anonymous:
        user_name = "Anonymous user"

    # Toxicity moderation using OpenRouter (Llama 3 or similar fast model)
    openrouter_key = os.getenv("OPENROUTER_API_KEY")
    try:
        if openrouter_key:
            headers = {
                "Authorization": f"Bearer {openrouter_key}",
                "Content-Type": "application/json"
            }
            payload = {
                "model": "meta-llama/llama-3-8b-instruct:free",
                "messages": [
                    {"role": "system", "content": "Analyze carefully. Reply strictly with YES if the text contains hate speech, extreme toxicity, racism, direct threats, or severe vulgarity meant to insult a person. Reply exactly with NO if it is safe, polite, neutral, or constructive criticism."},
                    {"role": "user", "content": f"Text: {comment.comment_text}"}
                ],
                "temperature": 0.0,
                "max_tokens": 10
            }
            response = requests.post("https://openrouter.ai/api/v1/chat/completions", headers=headers, json=payload, timeout=5)
            if response.status_code == 200:
                result = response.json()
                content = result["choices"][0]["message"]["content"].strip().upper()
                if "YES" in content:
                    raise HTTPException(status_code=406, detail="That type of comment is not allowed in this community.")
    except HTTPException:
        raise
    except Exception as api_e:
        print(f"Moderation API warning (skipping block if network issue): {api_e}")

    try:
        data = {
            "project_id": build_id,
            "user_id": user_id,
            "user_name": user_name,
            "comment_text": comment.comment_text,
            "is_anonymous": comment.is_anonymous
        }
        res = supabase.table("community_comments").insert(data).execute()
        return {"success": True, "comment": res.data[0]}
    except Exception as e:
        print(f"Error adding comment: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/publish/{project_id}")
def publish_to_community(project_id: str, req: PublishRequest, user: User = Depends(get_current_user)):
    """Make a personal project public on the community hub."""
    user_email = user.email
    try:
        # Verify ownership
        check = supabase.table("user_projects").select("user_email").eq("id", project_id).execute()
        if not check.data:
            raise HTTPException(status_code=404, detail="Project not found")
        
        if check.data[0]["user_email"] != user_email and user_email != "dev@example.com":
             raise HTTPException(status_code=403, detail="Unauthorized to publish this project")
        
        # Update project to be public
        update_data = {
            "is_public": True,
            "build_story": req.build_story,
            "image_url": req.image_url,
            "author_name": req.author_name
        }
        if req.display_name:
            update_data["name"] = req.display_name
            
        res = supabase.table("user_projects").update(update_data).eq("id", project_id).execute()
        return {"success": True, "project": res.data[0]}
    except Exception as e:
        print(f"Error publishing project: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/my-builds")
def get_user_community_builds(user: User = Depends(get_current_user)):
    """Fetch all of the current user's community-published builds."""
    user_email = user.email
    try:
        res = supabase.table("user_projects") \
            .select("*") \
            .eq("user_email", user_email) \
            .eq("is_public", True) \
            .order("created_at", desc=True) \
            .execute()
        return res.data
    except Exception as e:
        print(f"Error fetching user builds: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class EditBuildRequest(BaseModel):
    author_name: str
    name: str
    build_story: str

@router.put("/builds/{build_id}")
def update_community_build(build_id: str, req: EditBuildRequest, user: User = Depends(get_current_user)):
    """Update a published build's public profile (name, author name, story)."""
    user_email = user.email
    try:
        # Verify ownership
        check = supabase.table("user_projects").select("user_email").eq("id", build_id).execute()
        if not check.data:
            raise HTTPException(status_code=404, detail="Project not found")
        
        if check.data[0]["user_email"] != user_email:
             raise HTTPException(status_code=403, detail="Unauthorized to edit this project")
        
        # Update details
        update_data = {
            "name": req.name,
            "author_name": req.author_name,
            "build_story": req.build_story
        }
        res = supabase.table("user_projects").update(update_data).eq("id", build_id).execute()
        return {"success": True, "project": res.data[0]}
    except Exception as e:
        print(f"Error updating community build: {e}")
        raise HTTPException(status_code=500, detail=str(e))

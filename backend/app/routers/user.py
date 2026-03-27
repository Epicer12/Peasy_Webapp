from fastapi import APIRouter, UploadFile, File, Depends, HTTPException # type: ignore
import os
import json
from ..dependencies import get_current_user, User, get_warranty_supabase # type: ignore

router = APIRouter(
    prefix="/user",
    tags=["user"]
)

@router.get("/profile")
async def get_profile(current_user: User = Depends(get_current_user)):
    """
    Fetch user profile metadata (username, photo_url, etc.)
    Note: 'bio' column is missing in Supabase schema, so it's handled as optional/omitted.
    """
    supabase = get_warranty_supabase()
    try:
        print(f"DEBUG: Fetching profile for user: {current_user.uid}")
        # Only select columns that are confirmed to exist
        res = supabase.table("user_mappings") \
            .select("username, photo_url, email") \
            .eq("firebase_uid", current_user.uid) \
            .execute()
        
        if res.data:
            profile_data = res.data[0]
            # Handle photo_url: if it's a path, generate a signed URL
            raw_photo = profile_data.get("photo_url")
            if raw_photo and not raw_photo.startswith("http"):
                try:
                    signed_res = supabase.storage.from_("warranties").create_signed_url(raw_photo, 3600)
                    if isinstance(signed_res, dict) and "signedURL" in signed_res:
                        profile_data["photo_url"] = signed_res["signedURL"]
                    else:
                        profile_data["photo_url"] = getattr(signed_res, "signed_url", str(signed_res))
                except Exception as e:
                    print(f"DEBUG: Failed to sign URL for {raw_photo}: {e}")
                    profile_data["photo_url"] = None

            # --- BIO PERSISTENCE FALLBACK ---
            # Check Storage for profile.json since DB 'bio' column is missing
            storage_user_id = current_user.supabase_uid or current_user.uid
            profile_json_path = f"{storage_user_id}/profile.json"
            
            try:
                print(f"DEBUG: Checking for profile.json at {profile_json_path}")
                json_bytes = supabase.storage.from_("warranties").download(profile_json_path)
                extra_data = json.loads(json_bytes)
                profile_data["bio"] = extra_data.get("bio", "")
            except Exception as e:
                print(f"DEBUG: No profile.json found or failed to load: {e}")
                profile_data["bio"] = ""

            return profile_data
            
        return {
            "username": current_user.name,
            "email": current_user.email,
            "photo_url": None,
            "bio": ""
        }
    except Exception as e:
        print(f"PROFILE FETCH ERROR: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Profile fetch failed: {str(e)}")

@router.post("/profile-photo")
async def upload_profile_photo(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """
    Upload a profile photo to storage and update user_mappings record with the path.
    Returns a signed URL for immediate display.
    """
    try:
        if not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="File must be an image")

        supabase = get_warranty_supabase()
        bucket_name = "warranties"
        
        # 1. Upload to Storage in USER-SPECIFIC folder
        content = await file.read()
        file_ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
        storage_user_id = current_user.supabase_uid or current_user.uid
        file_path = f"{storage_user_id}/profile_photo.{file_ext}"
        
        print(f"DEBUG: Uploading profile photo to: {file_path}")
        
        # Upsert will overwrite if it exists
        supabase.storage.from_(bucket_name).upload(
            path=file_path,
            file=content,
            file_options={"upsert": "true", "content-type": file.content_type}
        )
        
        # 2. Update DB with path (NOT public URL)
        print(f"DEBUG: Updating user_mappings with path: {file_path}")
        supabase.table("user_mappings").update({
            "photo_url": file_path
        }).eq("firebase_uid", current_user.uid).execute()

        # 3. Return a signed URL for immediate use
        signed_res = supabase.storage.from_(bucket_name).create_signed_url(file_path, 3600)
        final_url = signed_res.get("signedURL") if isinstance(signed_res, dict) else getattr(signed_res, "signed_url", str(signed_res))

        return {"status": "success", "photo_url": final_url}
            
    except Exception as e:
        print(f"PROFILE PHOTO UPLOAD ERROR: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/update")
async def update_profile(
    payload: dict,
    current_user: User = Depends(get_current_user)
):
    """
    Update profile metadata (username).
    Bio is saved to profile.json in Storage as the DB column is missing.
    """
    username = payload.get("username")
    bio = payload.get("bio")
    
    if not username:
        raise HTTPException(status_code=400, detail="Username is required")

    supabase = get_warranty_supabase()
    try:
        # 1. Update Username in DB
        check_res = supabase.table("user_mappings") \
            .select("firebase_uid") \
            .eq("username", username) \
            .neq("firebase_uid", current_user.uid) \
            .execute()
        
        if check_res.data:
            raise HTTPException(status_code=400, detail="Username already taken")
            
        supabase.table("user_mappings") \
            .update({ "username": username }) \
            .eq("firebase_uid", current_user.uid) \
            .execute()
            
        # 2. Update Bio in Storage
        storage_user_id = current_user.supabase_uid or current_user.uid
        profile_json_path = f"{storage_user_id}/profile.json"
        
        print(f"DEBUG: Saving bio to {profile_json_path}")
        json_content = json.dumps({"bio": bio or ""}, indent=2).encode('utf-8')
        
        try:
            # Try upload (works if new) or update (works if exists)
            supabase.storage.from_("warranties").upload(
                path=profile_json_path,
                file=json_content,
                file_options={"upsert": "true", "content-type": "application/json"}
            )
        except Exception:
            supabase.storage.from_("warranties").update(
                path=profile_json_path,
                file=json_content,
                file_options={"content-type": "application/json"}
            )
            
        return {"status": "success", "message": "Profile synced with cloud storage"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"PROFILE UPDATE ERROR: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Profile update failed: {str(e)}")

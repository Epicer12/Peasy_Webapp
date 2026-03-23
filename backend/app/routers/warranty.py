from fastapi import APIRouter, UploadFile, File, Depends, HTTPException  # type: ignore
from datetime import datetime
import uuid
import os
import traceback
from ..dependencies import get_current_user, User, get_warranty_supabase  # type: ignore
from ..services.openrouter_service import extract_warranty_info  # type: ignore

router = APIRouter(
    prefix="/warranty",
    tags=["warranty"]
)

async def save_json_metadata(bucket_name: str, json_path: str, data: dict):
    """
    Robustly saves JSON metadata to Supabase Storage using the SERVICE ROLE client.
    The service role bypasses RLS and content-type restrictions, ensuring the JSON
    is always persisted regardless of bucket policies.
    """
    import json
    # Always use the service role admin client for JSON saves
    supabase = get_warranty_supabase()
    json_content = json.dumps(data, indent=2, default=str).encode('utf-8')

    print(f"DEBUG: [SAVE_JSON] Attempting save to bucket='{bucket_name}', path='{json_path}'...")

    # Strategy 1: upload with upsert="true" (string required by this supabase-py version)
    try:
        res = supabase.storage.from_(bucket_name).upload(
            path=json_path,
            file=json_content,
            file_options={
                "content-type": "application/json",
                "upsert": "true",
                "cache-control": "3600"
            }
        )
        print(f"DEBUG: [SAVE_JSON] Upload success: {res}")
        return True
    except Exception as e1:
        print(f"WARNING: [SAVE_JSON] Upload with upsert='true' failed: {e1}")

    # Strategy 2: .update() fallback (works if file already exists)
    try:
        supabase.storage.from_(bucket_name).update(
            path=json_path,
            file=json_content,
            file_options={"content-type": "application/json", "cache-control": "3600"}
        )
        print(f"DEBUG: [SAVE_JSON] Fallback .update() success")
        return True
    except Exception as e2:
        print(f"CRITICAL ERROR: [SAVE_JSON] All strategies failed. Last error: {e2}")
        return False

@router.post("/upload")
async def upload_warranty(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """
    Uploads a warranty proof image to Supabase Storage and extracts info via OpenRouter.
    """
    try:
        print(f"DEBUG: Received upload request from user: {current_user.uid}")
        if not file.content_type.startswith("image/"):
            print(f"DEBUG: Invalid content type: {file.content_type}")
            raise HTTPException(status_code=400, detail="File must be an image")

        supabase = get_warranty_supabase()
        bucket_name = "warranties"

        # Read file content upfront
        content = await file.read()
        file_size_bytes = len(content)
        
        # 1. Upload to Supabase Storage
        file_extension = file.filename.split(".")[-1] if "." in file.filename else "jpg"
        file_name = f"{uuid.uuid4()}.{file_extension}"
        
        # Use the mapped Supabase UID for the folder name (CRITICAL for RLS)
        if not current_user.supabase_uid:
            print(f"ERROR: Supabase UID missing for user {current_user.uid}. Cannot proceed with upload.")
            raise HTTPException(status_code=401, detail="User mapping not established. Please try logging in again.")
            
        storage_user_id = current_user.supabase_uid
        file_path = f"{storage_user_id}/{file_name}"
        print(f"DEBUG: Using strict Supabase storage path: {file_path}")

        # Use a client with the USER TOKEN for the upload (to trigger RLS)
        if current_user.supabase_token:
            print("DEBUG: Using authenticated user client for upload (RLS enabled)")
            try:
                from supabase import create_client, ClientOptions
                # Properly use ClientOptions for v2
                opts = ClientOptions(headers={"Authorization": f"Bearer {current_user.supabase_token}"})
                user_supabase = create_client(
                    os.getenv("WARRANTY_SUPABASE_URL"), 
                    os.getenv("WARRANTY_SUPABASE_KEY"),
                    options=opts
                )
                storage_client = user_supabase.storage
            except Exception as client_err:
                print(f"ERROR: Failed to create authenticated client: {client_err}")
                storage_client = supabase.storage # Fallback
        else:
            print("WARNING: No supabase_token found. Using service role.")
            storage_client = supabase.storage

        # Perform the upload
        try:
            print(f"DEBUG: Starting upload to bucket '{bucket_name}'...")
            res = storage_client.from_(bucket_name).upload(
                path=file_path,
                file=content,
                file_options={"content-type": file.content_type}
            )
            print(f"DEBUG: Upload result: {res}")
        except Exception as upload_err:
            print(f"ERROR: Upload failed: {upload_err}")
            print(traceback.format_exc())
            raise HTTPException(status_code=500, detail=f"Upload failed: {str(upload_err)}")

        # 2. Extract info via OpenRouter
        print("DEBUG: Calling OpenRouter for extraction...")
        extraction_result = await extract_warranty_info(content)

        # 3. Save to Database (warranties table)
        print(f"DEBUG: Saving to database for user {current_user.uid} (Supabase ID: {current_user.supabase_uid})")
        try:
            db_res = supabase.table("warranties").insert({
                "user_id": current_user.supabase_uid or current_user.uid,
                "image_path": file_path,
                "extraction_data": extraction_result,
                "created_at": datetime.utcnow().isoformat()
            }).execute()
            print(f"DEBUG: Database insert result: {db_res}")
        except Exception as db_err:
            print(f"ERROR: Database insert failed: {db_err}")
            print(traceback.format_exc())

        # 4. Save JSON metadata to Storage (in the same user-specific folder as the image)
        # user_name from session always overrides any OCR-extracted null
        json_file_name = f"{file_name.split('.')[0]}.json"
        json_path = f"{storage_user_id}/{json_file_name}"

        wrapped_data = {
            "user_name": current_user.name or extraction_result.get("user_name"),
            "user_id": current_user.uid,
            "supabase_user_id": storage_user_id,
            "image_filename": file_name,
            "image_path": file_path,
            "content_type": file.content_type,
            "file_size_bytes": file_size_bytes,
            "upload_timestamp": datetime.utcnow().isoformat() + "Z",
            "warranty_info": extraction_result.get("warranty_info", extraction_result)
        }

        print(f"DEBUG: Saving JSON metadata to storage path: {json_path}")
        json_saved = await save_json_metadata(bucket_name, json_path, wrapped_data)
        if json_saved:
            print(f"DEBUG: JSON metadata saved successfully at {json_path}")
        else:
            print(f"WARNING: JSON metadata could not be saved at {json_path}")

        # 4. Create Signed URL
        print(f"DEBUG: Creating signed URL...")
        try:
            signed_url_res = supabase.storage.from_(bucket_name).create_signed_url(file_path, 3600)
            if isinstance(signed_url_res, dict) and "signedURL" in signed_url_res:
                image_url = signed_url_res["signedURL"]
            else:
                image_url = getattr(signed_url_res, "signed_url", str(signed_url_res))
        except Exception as url_err:
            print(f"ERROR: Signed URL generation failed: {url_err}")
            image_url = None

        return {
            "status": "success",
            "id": db_res.data[0]["id"] if db_res.data else None,
            "image_url": image_url,
            "extraction": extraction_result
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"CRITICAL ERROR in upload_warranty: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Unexpected server error: {str(e)}")

@router.post("/finalize")
async def finalize_warranty(
    payload: dict,
    current_user: User = Depends(get_current_user)
):
    """
    Finalizes warranty data: saves as data.json in storage and updates DB.
    Expected payload: { "id": "uuid", "extraction_data": { ... } }
    """
    warranty_id = payload.get("id")
    final_data = payload.get("extraction_data")

    if not warranty_id or not final_data:
        raise HTTPException(status_code=400, detail="Missing warranty ID or extraction data")

    supabase = get_warranty_supabase()
    
    try:
        # 1. Fetch current record to get image_path (to find the folder)
        res = supabase.table("warranties").select("image_path").eq("id", warranty_id).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Warranty record not found")
        
        image_path = res.data[0]["image_path"].replace("\\", "/")
        
        # Security check: Ensure the image path starts with the user's Supabase UID
        if current_user.supabase_uid and not image_path.startswith(f"{current_user.supabase_uid}/"):
             print(f"SECURITY WARNING: User {current_user.uid} (SB: {current_user.supabase_uid}) tried to finalize a path they don't own: {image_path}")
             raise HTTPException(status_code=403, detail="Unauthorised access to warranty data")

        # Deriving JSON path from image path (e.g. user_id/uuid.jpg -> user_id/uuid.json)
        base_path = image_path.rsplit(".", 1)[0]
        json_path = f"{base_path}.json"
        
        print(f"DEBUG: Finalizing metadata to {json_path}")
        
        print(f"DEBUG: Finalizing for {warranty_id}, metadata path: {json_path}")

        # 2. Save finalized JSON to Storage (overwrites initial OCR JSON with user-confirmed data)
        import json

        safe_final_data = final_data if final_data is not None else {}
        wrapped_data = {
            "user_name": current_user.name,
            "user_id": current_user.uid,
            "supabase_user_id": current_user.supabase_uid,
            "finalized_at": datetime.utcnow().isoformat() + "Z",
            "warranty_info": safe_final_data.get("warranty_info", safe_final_data)
        }
        json_content = json.dumps(wrapped_data, indent=2, default=str).encode('utf-8')
        
        # Use user client for RLS if token available
        if current_user.supabase_token:
            from supabase import create_client, ClientOptions
            opts = ClientOptions(headers={"Authorization": f"Bearer {current_user.supabase_token}"})
            user_supabase = create_client(
                os.getenv("WARRANTY_SUPABASE_URL"), 
                os.getenv("WARRANTY_SUPABASE_KEY"),
                options=opts
            )
            storage_client = user_supabase.storage
        else:
            storage_client = supabase.storage

        # Use save_json_metadata helper (service role, multi-strategy) for reliable finalization
        print(f"DEBUG: Finalizing JSON metadata to {json_path}")
        json_saved = await save_json_metadata("warranties", json_path, wrapped_data)
        if json_saved:
            print(f"DEBUG: Finalized JSON metadata saved successfully at {json_path}")
        else:
            print(f"WARNING: Finalized JSON metadata could not be saved at {json_path}")

        # 3. Update Database
        print(f"DEBUG: Updating database record...")
        supabase.table("warranties").update({
            "extraction_data": final_data
        }).eq("id", warranty_id).execute()

        return {"status": "success", "message": "Warranty data finalized and synced"}

    except Exception as e:
        print(f"ERROR in finalize_warranty: {str(e)}")
        print(traceback.format_exc())
@router.delete("/{warranty_id}")
async def delete_warranty(
    warranty_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Deletes a warranty record and its associated image from storage.
    """
    supabase = get_warranty_supabase()
    try:
        # 1. Fetch record to get image_path
        res = supabase.table("warranties").select("image_path").eq("id", warranty_id).eq("user_id", current_user.supabase_uid or current_user.uid).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Warranty record not found or access denied")
        
        image_path = res.data[0]["image_path"]
        
        # 2. Delete from DB
        supabase.table("warranties").delete().eq("id", warranty_id).execute()
        
        # 3. Delete from Storage (Optional but recommended)
        try:
            supabase.storage.from_("warranties").remove([image_path])
            # Also try to remove the associated JSON metadata
            json_path = image_path.rsplit(".", 1)[0] + ".json"
            supabase.storage.from_("warranties").remove([json_path])
        except Exception as storage_err:
            print(f"WARNING: File deletion failed: {storage_err}")

        return {"status": "success", "message": "Warranty record deleted"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"DELETE ERROR: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@router.get("/list")
async def list_warranties(current_user: User = Depends(get_current_user)):
    """
    List all warranties for the current user.
    """
    supabase = get_warranty_supabase()
    try:
        print(f"DEBUG: Listing warranties for user_id: {current_user.supabase_uid or current_user.uid}")
        res = supabase.table("warranties") \
            .select("*") \
            .eq("user_id", current_user.supabase_uid or current_user.uid) \
            .order("created_at", desc=True) \
            .execute()
        
        # Add signed URLs for images
        items = res.data or []
        for item in items:
            image_path = item.get("image_path")
            if image_path:
                try:
                    signed_url_res = supabase.storage.from_("warranties").create_signed_url(image_path, 3600)
                    if isinstance(signed_url_res, dict) and "signedURL" in signed_url_res:
                        item["image_url"] = signed_url_res["signedURL"]
                    else:
                        item["image_url"] = getattr(signed_url_res, "signed_url", str(signed_url_res))
                except Exception as url_err:
                    print(f"WARNING: Signed URL failed for {image_path}: {url_err}")
                    item["image_url"] = None

        print(f"DEBUG: Successfully retrieved {len(items)} records with signed URLs")
        return items
    except Exception as e:
        print(f"LIST ERROR: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Database list failed: {str(e)}")


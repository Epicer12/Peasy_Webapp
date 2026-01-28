import os
import re

from fastapi import APIRouter, Depends, HTTPException
from supabase import create_client

from ..dependencies import get_current_user

router = APIRouter()

_SUPABASE = None


def _get_supabase():
    global _SUPABASE
    if _SUPABASE is None:
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        if not url or not key:
            raise HTTPException(
                status_code=503,
                detail="Storage not configured (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)",
            )
        _SUPABASE = create_client(url, key)
    return _SUPABASE


@router.get("/models/{model_id}")
async def get_model(model_id: str, user=Depends(get_current_user)):
    if not user.has_access(model_id):
        raise HTTPException(status_code=403)

    if not re.match(r"^[a-zA-Z0-9_-]+$", model_id):
        raise HTTPException(status_code=400, detail="Invalid model_id")

    path = f"{model_id}.glb"
    try:
        supabase = _get_supabase()
        # Fix: Bucket name is case-sensitive and should be "Models"
        result = supabase.storage.from_("Models").create_signed_url(path, 600)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create signed URL: {e}")

    # Handle both object and dict responses, and check all common key casing
    obj = getattr(result, "data", result)
    if isinstance(obj, dict):
        url = obj.get("signedURL") or obj.get("signedUrl") or obj.get("signed_url")
    else:
        url = (
            getattr(obj, "signedURL", None) or 
            getattr(obj, "signedUrl", None) or 
            getattr(obj, "signed_url", None)
        )
    
    if not url:
        raise HTTPException(status_code=404, detail="Model not found")

    return {"url": url}

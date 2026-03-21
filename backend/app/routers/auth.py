from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel, Field
from typing import Optional
from ..services.otp_service import send_otp, verify_otp
from ..services.firebase_service import verify_firebase_token
from ..dependencies import get_warranty_supabase

router = APIRouter(
    prefix="/auth",
    tags=["auth"]
)

class SendOtpRequest(BaseModel):
    email: str

class VerifyOtpRequest(BaseModel):
    email: str
    otp: str

class RegisterRequest(BaseModel):
    username: str

@router.post("/send-otp")
async def handle_send_otp(payload: SendOtpRequest):
    """
    Generates and sends an OTP to the user's email via Resend.
    """
    print(f"DEBUG: Send OTP request for email: {payload.email}")
    try:
        res = await send_otp(payload.email)
        if res["status"] == "error":
            print(f"DEBUG: OTP service error: {res['message']}")
            raise HTTPException(status_code=400, detail=res["message"])
        return {"message": "OTP_SENT"}
    except Exception as e:
        print(f"DEBUG: Unexpected error in handle_send_otp: {e}")
        if isinstance(e, HTTPException): raise e
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/verify-otp")
async def handle_verify_otp(payload: VerifyOtpRequest):
    """
    Verifies the OTP code.
    """
    print(f"DEBUG: Verify OTP request for email: {payload.email}, code: {payload.otp}")
    try:
        res = await verify_otp(payload.email, payload.otp)
        if res["status"] == "error":
            print(f"DEBUG: OTP verification error: {res['message']}")
            raise HTTPException(status_code=400, detail=res["message"])
        return {"message": "VERIFIED"}
    except Exception as e:
        print(f"DEBUG: Unexpected error in handle_verify_otp: {e}")
        if isinstance(e, HTTPException): raise e
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/register")
async def register_user(
    payload: RegisterRequest, 
    authorization: str = Header(None)
):
    """
    Finalizes registration by verifying the Firebase ID token and 
    mapping the user in Supabase.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="INVALID_AUTH_HEADER")
    
    id_token = authorization.split("Bearer ")[1]
    decoded_token = verify_firebase_token(id_token)
    
    if not decoded_token:
        raise HTTPException(status_code=401, detail="INVALID_FIREBASE_TOKEN")
    
    firebase_uid = decoded_token.get("uid")
    email = decoded_token.get("email")
    
    # Update Supabase user_mappings
    supabase = get_warranty_supabase()
    try:
        # Check if username exists
        user_check = supabase.table("user_mappings").select("*").eq("username", payload.username).execute()
        if user_check.data:
            # If it's the same user, it's fine, otherwise it's taken
            if user_check.data[0]['email'] != email:
                raise HTTPException(status_code=400, detail="USERNAME_TAKEN")

        # Upsert mapping
        data = {
            "supabase_id": firebase_uid, # Using Firebase UID as primary ID in mappings
            "username": payload.username,
            "email": email,
            "firebase_uid": firebase_uid
        }
        supabase.table("user_mappings").upsert(data).execute()
        
        return {"message": "USER_REGISTERED", "uid": firebase_uid}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"ERROR: REGISTRATION_FAILED: {e}")
        raise HTTPException(status_code=500, detail=f"REGISTRATION_FAILED: {str(e)}")

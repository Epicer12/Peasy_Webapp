import os
import random
import string
from datetime import datetime, timedelta, timezone
from .email_service import send_otp_email
from ..dependencies import get_warranty_supabase

def generate_otp(length: int = 6) -> str:
    """Generates a random N-digit OTP string."""
    return ''.join(random.choices(string.digits, k=length))

async def send_otp(email: str):
    """
    Generates, stores, and sends an OTP to the user's email.
    Includes rate limiting check (1 min).
    """
    supabase = get_warranty_supabase()
    now = datetime.now(timezone.utc)
    
    # 1. Rate Limit Check (60 seconds)
    try:
        res = supabase.table("otps").select("last_sent_at").eq("email", email).execute()
        if res.data:
            last_sent = datetime.fromisoformat(res.data[0]['last_sent_at'].replace('Z', '+00:00'))
            if (now - last_sent) < timedelta(seconds=60):
                return {"status": "error", "message": "RATE_LIMIT_EXCEEDED", "detail": "Please wait 60 seconds before requesting a new OTP."}
    except Exception as e:
        print(f"DEBUG: Rate limit check failed (maybe table empty): {e}")

    # 2. Generate OTP
    otp = generate_otp(6)
    expires_at = now + timedelta(minutes=5)
    
    # 3. Upsert into Supabase
    try:
        data = {
            "email": email,
            "otp": otp,
            "expires_at": expires_at.isoformat(),
            "attempts": 0,
            "last_sent_at": now.isoformat()
        }
        supabase.table("otps").upsert(data).execute()
    except Exception as e:
        print(f"ERROR: FAILED_TO_STORE_OTP: {e}")
        return {"status": "error", "message": "DATABASE_ERROR", "detail": str(e)}

    # 4. Send Email
    sent = await send_otp_email(email, otp)
    if sent:
        return {"status": "success", "message": "OTP_SENT"}
    else:
        return {"status": "error", "message": "EMAIL_DELIVERY_FAILED"}

async def verify_otp(email: str, input_otp: str):
    """
    Verifies the OTP provided by the user.
    Handles expiration, max attempts (3), and one-time use.
    """
    supabase = get_warranty_supabase()
    now = datetime.now(timezone.utc)
    
    try:
        res = supabase.table("otps").select("*").eq("email", email).execute()
        if not res.data:
            return {"status": "error", "message": "OTP_NOT_FOUND"}
            
        row = res.data[0]
        
        # 1. Check Attempts
        if row['attempts'] >= 3:
            return {"status": "error", "message": "TOO_MANY_ATTEMPTS", "detail": "Please request a new OTP."}
            
        # 2. Check Expiration
        expires_at = datetime.fromisoformat(row['expires_at'].replace('Z', '+00:00'))
        if expires_at < now:
            supabase.table("otps").delete().eq("email", email).execute()
            return {"status": "error", "message": "OTP_EXPIRED"}
            
        # 3. Check Match
        if row['otp'] != input_otp:
            # Increment attempts
            supabase.table("otps").update({"attempts": row['attempts'] + 1}).eq("email", email).execute()
            return {"status": "error", "message": "INVALID_OTP", "remaining_attempts": 3 - (row['attempts'] + 1)}
            
        # 4. Success - Delete row (one-time use)
        supabase.table("otps").delete().eq("email", email).execute()
        return {"status": "success", "message": "VERIFIED"}
        
    except Exception as e:
        print(f"ERROR: VERIFICATION_FAILED: {e}")
        return {"status": "error", "message": "INTERNAL_ERROR", "detail": str(e)}

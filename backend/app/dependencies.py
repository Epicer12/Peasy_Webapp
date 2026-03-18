import os
import time
import jwt
from typing import Optional
from fastapi import Header, HTTPException

# Try to import Firebase Admin SDK (optional dependency)
try:
    import firebase_admin
    from firebase_admin import credentials, auth
    
    # Initialize Firebase Admin if credentials are provided
    if not firebase_admin._apps:
        cred_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
        if cred_path and os.path.exists(cred_path):
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
            FIREBASE_ENABLED = True
        else:
            FIREBASE_ENABLED = False
    else:
        FIREBASE_ENABLED = True
except ImportError:
    FIREBASE_ENABLED = False

try:
    from supabase import create_client, Client as SupabaseClient
    SUPABASE_AVAILABLE = True
except ImportError:
    SUPABASE_AVAILABLE = False
    SupabaseClient = None

_SUPABASE_CLIENT = None
_WARRANTY_SUPABASE_CLIENT = None

def get_supabase():
    global _SUPABASE_CLIENT
    if not SUPABASE_AVAILABLE:
        raise HTTPException(status_code=503, detail="supabase package not installed")
    if _SUPABASE_CLIENT is None:
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        if not url or not key:
            raise HTTPException(
                status_code=503,
                detail="Supabase not configured (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)"
            )
        _SUPABASE_CLIENT = create_client(url, key)
    return _SUPABASE_CLIENT

def get_warranty_supabase():
    global _WARRANTY_SUPABASE_CLIENT
    print("DEBUG: get_warranty_supabase() called")
    if not SUPABASE_AVAILABLE:
        raise HTTPException(status_code=503, detail="supabase package not installed")
    if _WARRANTY_SUPABASE_CLIENT is None:
        url = os.getenv("WARRANTY_SUPABASE_URL")
        key = os.getenv("WARRANTY_SUPABASE_KEY")
        print(f"DEBUG: Initializing Supabase client with URL: {url}")
        if not url or not key:
            raise HTTPException(
                status_code=503,
                detail="Warranty Storage not configured (WARRANTY_SUPABASE_URL, WARRANTY_SUPABASE_KEY)"
            )
        _WARRANTY_SUPABASE_CLIENT = create_client(url, key)
        print("DEBUG: Supabase client initialized")
    return _WARRANTY_SUPABASE_CLIENT


class User:
    """User class with access control and Supabase session mapping"""
    def __init__(self, uid: str, email: Optional[str] = None, supabase_token: Optional[str] = None, supabase_uid: Optional[str] = None, name: Optional[str] = None):
        self.uid = uid  # Firebase UID
        self.email = email
        self.supabase_token = supabase_token  # JWT for Supabase RLS
        self.supabase_uid = supabase_uid      # Supabase Auth UUID
        self.name = name or email or uid
    
    def has_access(self, model_id: str) -> bool:
        return True

def get_supabase_user_token(firebase_uid: str, email: str):
    """
    Mapping Service: Links Firebase UID to a Supabase User for RLS.
    Returns (supabase_token, supabase_uid)
    """
    try:
        supabase = get_warranty_supabase() # Use the same project as storage for consistency
        
        # 1. Check if mapping exists
        print(f"DEBUG: Checking mapping for Firebase UID: {firebase_uid}")
        try:
            res = supabase.table("user_mappings").select("supabase_id").eq("firebase_uid", firebase_uid).execute()
        except Exception as table_err:
            print(f"CRITICAL ERROR: Mapping table access failed. Error: {table_err}")
            print("HINT: Have you run the SQL script 'setup_mapping_db.sql' in Supabase SQL Editor?")
            return None, None
            
        supabase_uid = None
        if res.data and len(res.data) > 0:
            supabase_uid = res.data[0]["supabase_id"]
            print(f"DEBUG: Found existing mapping to Supabase UID: {supabase_uid}")
        else:
            # 2. Create shadow user if not exists
            print(f"DEBUG: No mapping found. Creating shadow Supabase user for {email}")
            password = os.urandom(16).hex()
            
            try:
                auth_res = supabase.auth.admin.create_user({
                    "email": email,
                    "password": password,
                    "email_confirm": True
                })
                supabase_uid = auth_res.user.id
                print(f"DEBUG: Created new Supabase user: {supabase_uid}")
                
                # Save mapping
                supabase.table("user_mappings").insert({
                    "firebase_uid": firebase_uid,
                    "supabase_id": supabase_uid
                }).execute()
            except Exception as e:
                print(f"WARNING: User creation error (might already exist): {e}")
                # Fallback: search by email
                user_list = supabase.auth.admin.list_users()
                for u in user_list:
                    if u.email == email:
                        supabase_uid = u.id
                        # Save mapping if found
                        supabase.table("user_mappings").upsert({
                            "firebase_uid": firebase_uid,
                            "supabase_id": supabase_uid
                        }).execute()
                        break

        if not supabase_uid:
            print("ERROR: Failed to resolve Supabase UID for the user.")
            return None, None

        print(f"DEBUG: Mapping successful. Supabase UID: {supabase_uid}")

        # 3. Create a custom JWT/Session for this user
        secret = os.getenv("SUPABASE_JWT_SECRET")
        if not secret:
            print("ERROR: SUPABASE_JWT_SECRET missing in .env")
            return None, supabase_uid

        payload = {
            "aud": "authenticated",
            "exp": int(time.time()) + 3600,
            "sub": supabase_uid,
            "email": email,
            "role": "authenticated"
        }
        encoded_token = jwt.encode(payload, secret, algorithm="HS256")
        print("DEBUG: Generated Supabase JWT for RLS")
        
        return encoded_token, supabase_uid
    except Exception as global_err:
        print(f"UNEXPECTED ERROR in get_supabase_user_token: {global_err}")
        import traceback
        traceback.print_exc()
        return None, None


async def get_current_user(authorization: str = Header(None)):
    """
    Verify Firebase ID token and return authenticated user.
    Falls back to basic token validation if Firebase Admin is not configured.
    """
    auth_header_str = str(authorization) if authorization else 'None'
    print(f"DEBUG: get_current_user() called, Auth header: {auth_header_str[:20]}...")
    if not authorization:
        raise HTTPException(status_code=403, detail="Missing Authorization Header")

    token = authorization.replace("Bearer ", "").strip()
    if not token:
        raise HTTPException(status_code=403, detail="Invalid Token")

    if FIREBASE_ENABLED:
        try:
            # Verify Firebase ID token
            decoded_token = auth.verify_id_token(token)
            uid = decoded_token.get("uid")
            email = decoded_token.get("email")
            name = decoded_token.get("name")
            
            # Map Firebase User to Supabase for RLS
            sb_token, sb_uid = get_supabase_user_token(uid, email)
            
            return User(uid=uid, email=email, supabase_token=sb_token, supabase_uid=sb_uid, name=name)
        except Exception as e:
            print(f"AUTH ERROR: {e}")
            raise HTTPException(
                status_code=403,
                detail=f"Invalid Firebase token: {str(e)}"
            )
    else:
        # Fallback for development if Firebase Admin is not configured
        print("DEBUG: Firebase Admin not enabled, attempting insecure token decode")
        try:
            # We can decode the payload without a secret to get the uid
            decoded = jwt.decode(token, options={"verify_signature": False})
            uid = decoded.get("user_id") or decoded.get("sub") or "dev_user"
            email = decoded.get("email", "dev@example.com")
            print(f"DEBUG: Extracted UID from token: {uid}")
            
            # Even in dev, we try to get a mapping if possible
            sb_token, sb_uid = get_supabase_user_token(uid, email)
            
            return User(uid=uid, email=email, supabase_token=sb_token, supabase_uid=sb_uid)
        except Exception as e:
            print(f"DEBUG: Token decode failed: {e}. Defaulting to dev_user")
            return User(uid="dev_user", email="dev@example.com")
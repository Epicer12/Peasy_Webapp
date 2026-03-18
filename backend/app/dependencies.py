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


from supabase import create_client

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

_WARRANTY_SUPABASE = None

def get_warranty_supabase():
    global _WARRANTY_SUPABASE
    if _WARRANTY_SUPABASE is None:
        url = os.getenv("WARRANTY_SUPABASE_URL") or os.getenv("MAIN_SUPABASE_URL")
        key = os.getenv("WARRANTY_SUPABASE_KEY") or os.getenv("MAIN_SUPABASE_KEY")
        if not url or not key:
            print("Warning: Warranty Supabase credentials not found")
        _WARRANTY_SUPABASE = create_client(url, key)
    return _WARRANTY_SUPABASE

def get_supabase_user_token(firebase_uid: str, email: str):
    """
    Mapping Service: Links Firebase UID to a Supabase User for RLS.
    Returns (supabase_token, supabase_uid)
    """
    try:
        supabase = get_warranty_supabase()
        
        # 1. Check if mapping exists
        try:
            res = supabase.table("user_mappings").select("supabase_id").eq("firebase_uid", firebase_uid).execute()
        except Exception as table_err:
            print(f"CRITICAL ERROR: Mapping table access failed. Error: {table_err}")
            return None, None
            
        supabase_uid = None
        if res.data and len(res.data) > 0:
            supabase_uid = res.data[0]["supabase_id"]
        else:
            # 2. Create shadow user if not exists
            password = os.urandom(16).hex()
            try:
                auth_res = supabase.auth.admin.create_user({
                    "email": email,
                    "password": password,
                    "email_confirm": True
                })
                supabase_uid = auth_res.user.id
                
                # Save mapping
                supabase.table("user_mappings").insert({
                    "firebase_uid": firebase_uid,
                    "supabase_id": supabase_uid
                }).execute()
            except Exception as e:
                print(f"WARNING: User creation error (might already exist): {e}")
                # Fallback: search by email
                try:
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
                except:
                    pass

        if not supabase_uid:
            return None, None

        # 3. Create a custom JWT for this user
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
        
        return encoded_token, supabase_uid
    except Exception as global_err:
        print(f"UNEXPECTED ERROR in get_supabase_user_token: {global_err}")
        return None, None

async def get_current_user(authorization: str = Header(None)):
    """
    Verify Firebase ID token and return authenticated user.
    """
    if not authorization:
        # Fallback for development
        return User(uid="dev_user", email="dev@example.com", name="Dev User", supabase_uid="00000000-0000-0000-0000-000000000000")

    token = authorization.replace("Bearer ", "").strip()
    
    if FIREBASE_ENABLED:
        try:
            decoded_token = auth.verify_id_token(token)
            uid = decoded_token.get("uid")
            email = decoded_token.get("email")
            name = decoded_token.get("name", "User")
            
            sb_token, sb_uid = get_supabase_user_token(uid, email)
            return User(uid=uid, email=email, name=name, supabase_uid=sb_uid, supabase_token=sb_token)
        except Exception as e:
            raise HTTPException(status_code=403, detail=f"Invalid Firebase token: {str(e)}")
    else:
        try:
            # Fallback: decode without verification to get user identity in dev
            decoded = jwt.decode(token, options={"verify_signature": False})
            uid = decoded.get("user_id") or decoded.get("sub") or "dev_user"
            email = decoded.get("email", "dev@example.com")
            sb_token, sb_uid = get_supabase_user_token(uid, email)
            return User(uid=uid, email=email, name="Dev User", supabase_uid=sb_uid, supabase_token=sb_token)
        except:
            return User(uid="dev_user", email="dev@example.com", name="Dev User", supabase_uid="00000000-0000-0000-0000-000000000000", supabase_token=token)
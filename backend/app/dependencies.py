import os
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
    """User class with access control"""
    def __init__(self, uid: str, email: str = None, name: str = None, supabase_uid: str = None, supabase_token: str = None):
        self.uid = uid
        self.email = email
        self.name = name
        self.supabase_uid = supabase_uid
        self.supabase_token = supabase_token
    
    def has_access(self, model_id: str) -> bool:
        return True

_WARRANTY_SUPABASE = None

def get_warranty_supabase():
    global _WARRANTY_SUPABASE
    if _WARRANTY_SUPABASE is None:
        url = os.getenv("WARRANTY_SUPABASE_URL") or os.getenv("SUPABASE_URL")
        key = os.getenv("WARRANTY_SUPABASE_KEY") or os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        if not url or not key:
            print("Warning: Warranty Supabase credentials not found")
        _WARRANTY_SUPABASE = create_client(url, key)
    return _WARRANTY_SUPABASE

async def get_current_user(authorization: str = Header(None)):
    """
    Verify Firebase ID token and return authenticated user.
    """
    if not authorization:
        # Fallback for development if no header
        return User(uid="dev_user", email="dev@example.com", name="Dev User", supabase_uid="00000000-0000-0000-0000-000000000000")

    token = authorization.replace("Bearer ", "").strip()
    
    if FIREBASE_ENABLED:
        try:
            decoded_token = auth.verify_id_token(token)
            uid = decoded_token.get("uid")
            email = decoded_token.get("email")
            name = decoded_token.get("name", "User")
            # In a real app, you'd map Firebase UID to Supabase UID here
            return User(uid=uid, email=email, name=name, supabase_uid=uid, supabase_token=token)
        except Exception as e:
            raise HTTPException(status_code=403, detail=f"Invalid Firebase token: {str(e)}")
    else:
        return User(uid="dev_user", email="dev@example.com", name="Dev User", supabase_uid="00000000-0000-0000-0000-000000000000", supabase_token=token)
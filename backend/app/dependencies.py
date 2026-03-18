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


class User:
    """User class with access control"""
    def __init__(self, uid: str, email: str = None):
        self.uid = uid
        self.email = email
    
    def has_access(self, model_id: str) -> bool:
        """
        Check if user has access to a specific model.
        Currently allows all authenticated users to access all models.
        Implement custom logic here based on your requirements.
        """
        return True


async def get_current_user(authorization: str = Header(None)):
    """
    Verify Firebase ID token and return authenticated user.
    Falls back to basic token validation if Firebase Admin is not configured.
    """
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
            return User(uid=uid, email=email)
        except Exception as e:
            raise HTTPException(
                status_code=403,
                detail=f"Invalid Firebase token: {str(e)}"
            )
    else:
        # Fallback: Basic token validation (for development)
        # WARNING: This is not secure for production use
        return User(uid="dev_user", email="dev@example.com")
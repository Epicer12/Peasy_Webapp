import firebase_admin
from firebase_admin import auth, credentials
import os

# Initialize Firebase Admin if not already initialized
try:
    if not firebase_admin._apps:
        # Check for service account path or default initialization
        cred_path = os.getenv("FIREBASE_SERVICE_ACCOUNT")
        if cred_path and os.path.exists(cred_path):
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
        else:
            # Fallback to default credentials (from environment or ADC)
            firebase_admin.initialize_app()
except Exception as e:
    print(f"DEBUG: Firebase already initialized or failed: {e}")

def verify_firebase_token(id_token: str):
    """
    Verifies a Firebase ID token.
    Returns decoded token if valid, raises error otherwise.
    """
    try:
        decoded_token = auth.verify_id_token(id_token)
        return decoded_token
    except Exception as e:
        print(f"ERROR: FIREBASE_VERIFICATION_FAILED: {e}")
        return None

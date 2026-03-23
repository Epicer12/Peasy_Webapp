import os
from google.oauth2 import id_token
from google.auth.transport import requests

# Create a global request object for caching certificates
_request = requests.Request()

def verify_firebase_token(token_str: str):
    """
    Verifies a Firebase ID token.
    Returns decoded token if valid, raises error otherwise.
    """
    project_id = os.getenv("FIREBASE_PROJECT_ID")
    if not project_id:
        print("ERROR: FIREBASE_PROJECT_ID environment variable is missing.")
        return None

    try:
        decoded_token = id_token.verify_firebase_token(token_str, _request, audience=project_id, clock_skew_in_seconds=10)
        return decoded_token
    except Exception as e:
        print(f"ERROR: FIREBASE_VERIFICATION_FAILED: {e}")
        return None

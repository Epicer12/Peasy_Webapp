import os
import sys
from dotenv import load_dotenv

# Load from backend/.env relative to this file
dotenv_path = os.path.join(os.path.dirname(__file__), '..', '.env')
load_dotenv(dotenv_path)

# Ensure app is in path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.dependencies import get_supabase_user_token

def test_mapping_logic():
    firebase_uid = "test_firebase_uid_123"
    email = "test_user@example.com"
    
    print(f"Testing mapping logic for {email}...")
    try:
        token, uid, username = get_supabase_user_token(firebase_uid, email)
        print(f"RESULT: Token generated: {token[:20]}...")
        print(f"RESULT: Supabase UID: {uid}")
        print(f"RESULT: Username: {username}")
        assert token is not None
        assert uid is not None
    except Exception as e:
        print(f"FAILURE: Mapping logic crashed. Error: {e}")
        import traceback
        traceback.print_exc()
        raise e

if __name__ == "__main__":
    test_mapping_logic()

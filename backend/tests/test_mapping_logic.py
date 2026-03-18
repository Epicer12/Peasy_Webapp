
import os
import sys
from dotenv import load_dotenv

# Add the app directory to sys.path to import dependencies
sys.path.append(os.path.abspath(os.path.join(os.getcwd(), ".")))

load_dotenv()

from app.dependencies import get_supabase_user_token

def test_mapping():
    firebase_uid = "test_firebase_uid_123"
    email = "test_user@example.com"
    
    print(f"Testing mapping logic for {email}...")
    try:
        token, uid = get_supabase_user_token(firebase_uid, email)
        print(f"RESULT: Token generated: {token[:20]}...")
        print(f"RESULT: Supabase UID: {uid}")
    except Exception as e:
        print(f"FAILURE: Mapping logic crashed. Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_mapping()

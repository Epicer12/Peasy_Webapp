
import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

def test_admin_privileges():
    url = os.getenv("WARRANTY_SUPABASE_URL")
    key = os.getenv("WARRANTY_SUPABASE_KEY")
    supabase = create_client(url, key)
    
    print(f"Testing Admin Privileges on {url}")
    
    # 1. Test listing users (requires service role)
    try:
        users = supabase.auth.admin.list_users()
        print(f"SUCCESS: Successfully listed {len(users)} users. Key has Admin privileges.")
    except Exception as e:
        print(f"FAILURE: Could not list users. Error: {e}")
        print("HINT: The WARRANTY_SUPABASE_KEY might not be the 'service_role' key.")

    # 2. Test table access
    try:
        res = supabase.table("user_mappings").select("*").limit(1).execute()
        print("SUCCESS: Successfully accessed 'user_mappings' table.")
    except Exception as e:
        print(f"FAILURE: Could not access 'user_mappings' table. Error: {e}")

if __name__ == "__main__":
    test_admin_privileges()

import os
from dotenv import load_dotenv
from supabase import create_client

# Load environment variables
load_dotenv(dotenv_path="backend/.env")

url = os.getenv("WARRANTY_SUPABASE_URL") or os.getenv("MAIN_SUPABASE_URL")
key = os.getenv("WARRANTY_SUPABASE_KEY") or os.getenv("MAIN_SUPABASE_KEY")

if not url or not key:
    print("Error: Supabase credentials not found in backend/.env")
    exit(1)

supabase = create_client(url, key)

def migrate_database():
    print("--- Starting Database Migration ---")
    
    # Adding columns via SQL is tricky through Postgrest, 
    # but we can try to insert a dummy record to see if it works, 
    # or use a simple RPC if the user has one.
    # However, usually the user needs to do this in the dashboard.
    
    # We'll try to perform a test insertion with the new columns
    test_data = {
        "supabase_id": "00000000-0000-0000-0000-000000000000",
        "username": "migration_test",
        "email": "migration@test.com",
        "firebase_uid": "migration_test"
    }
    
    try:
        print("Testing insertion with new columns...")
        res = supabase.table("user_mappings").upsert(test_data).execute()
        print("Success! Columns already exist or were added.")
    except Exception as e:
        print(f"Migration Test Failed: {e}")
        print("\nACTION REQUIRED: Please go to your Supabase Dashboard -> SQL Editor and run:")
        print("ALTER TABLE user_mappings ADD COLUMN IF NOT EXISTS username TEXT;")
        print("ALTER TABLE user_mappings ADD COLUMN IF NOT EXISTS email TEXT;")

if __name__ == "__main__":
    migrate_database()

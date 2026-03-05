
import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

def check_mapping_table():
    url = os.getenv("WARRANTY_SUPABASE_URL")
    key = os.getenv("WARRANTY_SUPABASE_KEY")
    supabase = create_client(url, key)
    
    print(f"Checking table 'user_mappings' at {url}")
    try:
        res = supabase.table("user_mappings").select("*").limit(1).execute()
        print("SUCCESS: 'user_mappings' table exists.")
    except Exception as e:
        print(f"FAILURE: 'user_mappings' table test failed. Error: {e}")

if __name__ == "__main__":
    check_mapping_table()

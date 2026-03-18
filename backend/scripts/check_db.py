import os
import json
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

def check_db():
    url = os.getenv("WARRANTY_SUPABASE_URL")
    key = os.getenv("WARRANTY_SUPABASE_KEY")
    
    if not url or not key:
        print("Error: credentials not set.")
        return

    supabase = create_client(url, key)
    
    try:
        # Check the warranties table
        res = supabase.table("warranties").select("*").limit(10).execute()
        print(f"--- Warranties Table (Last 10) ---")
        for row in res.data:
            has_extraction = "YES" if row.get("extraction_data") else "NO"
            print(f"ID: {row['id']} | User: {row['user_id']} | Path: {row['image_path']} | Extraction: {has_extraction}")
            if row.get("extraction_data"):
                data = row["extraction_data"]
                # Check if it has the nested structure
                is_nested = "warranty_info" in data
                print(f"  Nested Structure: {is_nested}")
                
    except Exception as e:
        print(f"Error checking DB: {e}")

if __name__ == "__main__":
    check_db()

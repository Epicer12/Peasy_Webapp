import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

def debug_supabase():
    url = os.getenv("WARRANTY_SUPABASE_URL")
    key = os.getenv("WARRANTY_SUPABASE_KEY")
    
    print(f"Connecting to: {url}")
    print(f"Using Key: {key[:10]}...{key[-10:]}")
    
    try:
        supabase = create_client(url, key)
        
        print("\n--- Listing All Buckets ---")
        buckets = supabase.storage.list_buckets()
        if not buckets:
            print("No buckets found or no permission to list buckets.")
        else:
            for b in buckets:
                print(f"- Name: {b.name}, Public: {b.public}")
                
        print("\n--- Checking specific bucket 'warranties' ---")
        try:
            bucket = supabase.storage.get_bucket("warranties")
            print(f"Found bucket: {bucket.name}")
        except Exception as e:
            print(f"Error getting 'warranties' bucket: {e}")
            
    except Exception as e:
        print(f"Connection Error: {e}")

if __name__ == "__main__":
    debug_supabase()

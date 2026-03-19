import os
import asyncio
from dotenv import load_dotenv
from app.dependencies import get_warranty_supabase

load_dotenv()

async def diagnose():
    try:
        supabase = get_warranty_supabase()
        print("Supabase client initialized.")
        
        # Test Storage
        bucket_name = "warranties"
        try:
            bucket = supabase.storage.get_bucket(bucket_name)
            print(f"Bucket '{bucket_name}' found: {bucket}")
        except Exception as e:
            print(f"Storage Error: {e}")
            
        # Test Table
        try:
            res = supabase.table("warranties").select("*").limit(1).execute()
            print(f"Table 'warranties' test successful. Results: {res}")
        except Exception as e:
            print(f"Database Error: {e}")
            
    except Exception as e:
        print(f"General Connection Error: {e}")

if __name__ == "__main__":
    asyncio.run(diagnose())

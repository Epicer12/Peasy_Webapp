import os
import asyncio
from dotenv import load_dotenv
from app.dependencies import get_warranty_supabase

# Load env variables from backend/.env
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

url = os.getenv("MAIN_SUPABASE_URL")
key = os.getenv("MAIN_SUPABASE_KEY")

if not url or not key:
    print("Error: MAIN_SUPABASE_URL and MAIN_SUPABASE_KEY must be set in .env")
    exit(1)

supabase = create_client(url, key)

print("Attempting to list tables...")

try:
    # This query often works if pg_catalog access is allowed, or if there's a specific RPC
    # Since we can't easily query information_schema via postgrest directly without permissions/expose
    # We will try a few common names that might be used for PC parts
    common_names = ["products", "items", "inventory", "hardware", "cpu", "gpu", "ram", "motherboard"]
    
    for name in common_names:
        try:
            print(f"Checking table: {name}")
            response = supabase.table(name).select("count", count="exact").limit(0).execute()
            print(f"FOUND TABLE: {name} (Count: {response.count})")
        except Exception as e:
            pass # Table likely doesn't exist or not accessible
            
except Exception as e:
    print(f"Error: {e}")

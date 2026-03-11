import os
from supabase import create_client
from dotenv import load_dotenv

# Load env variables from backend/.env
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

url = os.getenv("MAIN_SUPABASE_URL")
key = os.getenv("MAIN_SUPABASE_KEY")

if not url or not key:
    print("Error: MAIN_SUPABASE_URL and MAIN_SUPABASE_KEY must be set in .env")
    exit(1)

supabase = create_client(url, key)

print("Searching for keyboards in peripherals_prices...")
res = supabase.table("peripherals_prices").select("*").ilike("component_name", "%keyboard%").limit(5).execute()
for item in res.data:
    print(item)

print("Searching for mice in peripherals_prices...")
res = supabase.table("peripherals_prices").select("*").ilike("component_name", "%mouse%").limit(5).execute()
for item in res.data:
    print(item)

import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    raise RuntimeError("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set in .env")

supabase = create_client(url, key)

print("Searching for keyboards in peripherals_prices...")
res = supabase.table("peripherals_prices").select("*").ilike("component_name", "%keyboard%").limit(5).execute()
for item in res.data:
    print(item)

print("Searching for mice in peripherals_prices...")
res = supabase.table("peripherals_prices").select("*").ilike("component_name", "%mouse%").limit(5).execute()
for item in res.data:
    print(item)

import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    raise RuntimeError("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set in .env")

supabase = create_client(url, key)

name = "AMD Ryzen 7 5700G"
print(f"Checking price for: {name}")

res = supabase.table("processors_prices").select("*").ilike("component_name", f"%{name}%").execute()
if res.data:
    for item in res.data:
        print(item)
else:
    print("No item found.")

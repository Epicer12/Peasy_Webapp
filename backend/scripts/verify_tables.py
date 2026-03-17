import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    raise RuntimeError("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set in .env")

supabase = create_client(url, key)

tables_to_check = ["cpu", "gpu", "ram", "storage_devices", "power_supplies", "cases", "motherboards", "coolers"]

print("Checking tables...")
for table in tables_to_check:
    try:
        response = supabase.table(table).select("*").limit(1).execute()
        print(f"✅ {table}: Exists")
    except Exception as e:
        print(f"❌ {table}: Error - {e}")

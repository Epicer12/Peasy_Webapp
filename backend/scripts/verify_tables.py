import os
from supabase import create_client
from dotenv import load_dotenv

# Load env variables from backend/.env
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

# Merged environment variable resolution to support both naming conventions
url = os.getenv("SUPABASE_URL") or os.getenv("MAIN_SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("MAIN_SUPABASE_KEY")

if not url or not key:
    print("Error: Supabase credentials not found in env")
    exit(1)

supabase = create_client(url, key)

# Standard hardware verification list to ensure all core tables are reachable for the build feature
tables_to_check = ["cpu", "gpu", "ram", "storage_devices", "power_supplies", "cases", "motherboards", "coolers"]

print("Checking tables...")
for table in tables_to_check:
    try:
        # Simple existence check present in both branches
        response = supabase.table(table).select("*").limit(1).execute()
        print(f"✅ {table}: Exists")
    except Exception as e:
        print(f"❌ {table}: Error - {e}")

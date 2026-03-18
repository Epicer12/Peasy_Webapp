import os
from dotenv import load_dotenv
from supabase import create_client

# Load env variables from backend/.env
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

# Merged environment variable resolution to support both naming conventions
url = os.getenv("SUPABASE_URL") or os.getenv("MAIN_SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("MAIN_SUPABASE_KEY")

if not url or not key:
    print("Error: Supabase credentials not found in env")
    exit(1)

supabase = create_client(url, key)

# Combined logic for inspecting peripheral categories to help with build suggestions
print("Searching for keyboards in peripherals_prices...")
res = supabase.table("peripherals_prices").select("*").ilike("component_name", "%keyboard%").limit(5).execute()
if res.data:
    for item in res.data:
        print(item)
else:
    print("No keyboards found.")

print("\nSearching for mice in peripherals_prices...")
res = supabase.table("peripherals_prices").select("*").ilike("component_name", "%mouse%").limit(5).execute()
if res.data:
    for item in res.data:
        print(item)
else:
    print("No mice found.")

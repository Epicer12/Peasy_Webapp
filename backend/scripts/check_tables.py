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

print("Listing tables...")
# Combined logic: checking likely peripheral table candidates as established in both branches
candidates = [
    "keyboards", "keyboard_prices", "keyboards_prices",
    "mice", "mouse_prices", "mice_prices",
    "peripherals", "peripherals_prices",
    "accessories", "accessories_prices",
    "other_prices"
]

found = []
for table in candidates:
    try:
        # Check if table exists by attempting a limited select
        res = supabase.table(table).select("*").limit(1).execute()
        print(f"✅ Found table: {table}")
        found.append(table)
    except Exception:
        # Silent pass if table doesn't exist, as intended in both versions
        pass

if not found:
    print("No peripheral tables found from the candidate list.")
else:
    print(f"Found peripheral tables: {found}")

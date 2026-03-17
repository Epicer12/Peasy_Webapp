import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    raise RuntimeError("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set in .env")

supabase = create_client(url, key)

print("Listing tables...")
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
        res = supabase.table(table).select("*").limit(1).execute()
        print(f"✅ Found table: {table}")
        found.append(table)
    except Exception:
        pass

if not found:
    print("No peripheral tables found from the candidate list.")
else:
    print(f"Found peripheral tables: {found}")

import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv('backend/.env')

url = os.getenv("MAIN_SUPABASE_URL")
key = os.getenv("MAIN_SUPABASE_KEY")

supabase = create_client(url, key)

print("Listing tables...")
# Creating a dummy query to some known table to verify connection
# Supabase-py doesn't have a direct "list_tables" method exposing API, 
# but we can try to infer or just check specific likely names.
# Alternatively, we can use the PostgREST introspection if accessible, but usually not via this client easily without raw SQL.
# Let's try to check likely candidates.

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
    except Exception as e:
        # print(f"❌ Table not found: {table}")
        pass

if not found:
    print("No peripheral tables found from the candidate list.")
else:
    print(f"Found peripheral tables: {found}")

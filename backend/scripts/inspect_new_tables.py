import os
import json
from dotenv import load_dotenv
from supabase import create_client

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    raise RuntimeError("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set in .env")

supabase = create_client(url, key)

tables = [
    "desktop_pcs_prices",
    "desktop_systems_prices",
    "expansion_cards_networking_prices",
    "cable_connector_prices",
    "cable_converter_prices",
    "console_handheld_gaming_prices",
    "party_box_pricing",
    "all_in_one_systems_prices"
]

results = {}

print("Inspecting tables...")
for table in tables:
    try:
        response = supabase.table(table).select("*").limit(1).execute()
        if response.data and len(response.data) > 0:
            columns = list(response.data[0].keys())
            results[table] = columns
            print(f"✅ {table}: Found {len(columns)} columns")
            has_name  = any(c.lower() in ['name', 'title', 'product_name', 'component', 'model'] for c in columns)
            has_price = any(c.lower() in ['price', 'cost', 'current_price'] for c in columns)
            if not has_name:
                print(f"   ⚠️  WARNING: No obvious 'name' column in {table}")
            if not has_price:
                print(f"   ⚠️  WARNING: No obvious 'price' column in {table}")
        else:
            print(f"⚠️ {table}: No data returned (Empty table?)")
            results[table] = "EMPTY"
    except Exception as e:
        print(f"❌ {table}: Error - {e}")
        results[table] = str(e)

print("\n--- Column Details ---")
print(json.dumps(results, indent=2))

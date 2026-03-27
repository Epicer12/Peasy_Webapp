<<<<<<< HEAD

=======
>>>>>>> origin/development
import os
from supabase import create_client
from dotenv import load_dotenv
import json

<<<<<<< HEAD
# Load env variables explicitly
env_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(env_path)

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_KEY") or os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    print(f"Error: Supabase credentials not found in env loaded from {env_path}")
    # Try reading file manually if dotenv fails
    try:
        with open(env_path, 'r') as f:
            for line in f:
                if line.startswith('SUPABASE_URL='):
                    url = line.split('=', 1)[1].strip().strip('"').strip("'")
                if line.startswith('SUPABASE_KEY='):
                    key = line.split('=', 1)[1].strip().strip('"').strip("'")
    except Exception as e:
        print(f"Failed to read .env manually: {e}")

if not url or not key:
    print("CRITICAL: Still no credentials.")
=======
# Load env variables from backend/.env
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

url = os.getenv("MAIN_SUPABASE_URL")
key = os.getenv("MAIN_SUPABASE_KEY")

if not url or not key:
    print("Error: MAIN_SUPABASE_URL and MAIN_SUPABASE_KEY must be set in .env")
>>>>>>> origin/development
    exit(1)

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
            # Get keys from first row
            columns = list(response.data[0].keys())
            results[table] = columns
            print(f"✅ {table}: Found {len(columns)} columns")
            # Check for critical columns
            has_name = any(c.lower() in ['name', 'title', 'product_name', 'component', 'model'] for c in columns)
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

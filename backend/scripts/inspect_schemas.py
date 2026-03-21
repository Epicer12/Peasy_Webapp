import os
from supabase import create_client
from dotenv import load_dotenv
import json

# Load env variables
load_dotenv('backend/.env')

url = os.getenv("MAIN_SUPABASE_URL")
key = os.getenv("MAIN_SUPABASE_KEY")

if not url or not key:
    print("CRITICAL: No credentials found.")
    exit(1)

supabase = create_client(url, key)

tables = [
    "cpu", "gpu", "ram", "storage_devices", 
    "power_supplies", "cases", "motherboard", "cpu_cooler"
]

results = {}

print("Inspecting table schemas...")
for table in tables:
    try:
        response = supabase.table(table).select("*").limit(1).execute()
        if response.data and len(response.data) > 0:
            results[table] = list(response.data[0].keys())
            print(f"✅ {table}: {results[table]}")
        else:
            print(f"⚠️ {table}: Empty table")
            results[table] = "EMPTY"
    except Exception as e:
        print(f"❌ {table}: Error - {e}")
        results[table] = str(e)

with open('backend/scripts/table_columns.json', 'w') as f:
    json.dump(results, f, indent=2)

import os
import json
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

# Combined table list from both branches for comprehensive inspection
tables = [
    "cpu",
    "motherboard",
    "ram",
    "gpu",
    "power_supplies",
    "cases",
    "processors_prices",
    "motherboards_prices"
]

for t in tables:
    try:
        print(f"\n--- Table: {t} ---")
        # Kept JSON formatted output for better legibility as requested in previous tasks
        res = supabase.table(t).select("*").limit(1).execute()
        if res.data:
            print(json.dumps(res.data[0], indent=2))
        else:
            print("No data found.")
    except Exception as e:
        print(f"Error fetching {t}: {e}")

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
        res = supabase.table(t).select("*").limit(1).execute()
        if res.data:
            print(json.dumps(res.data[0], indent=2))
        else:
            print("No data found.")
    except Exception as e:
        print(f"Error fetching {t}: {e}")

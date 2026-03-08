import os
from supabase import create_client
from dotenv import load_dotenv
import json

load_dotenv('backend/.env')

url = os.getenv("MAIN_SUPABASE_URL")
key = os.getenv("MAIN_SUPABASE_KEY")

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

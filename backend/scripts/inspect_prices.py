import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    raise RuntimeError("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set in .env")

supabase = create_client(url, key)

tables = [
    "processors_prices",
    "motherboards_prices",
    "memory_prices",
    "graphic_cards_prices"
]

print("--- Inspecting Price Tables ---")
for t in tables:
    try:
        res = supabase.table(t).select("*").limit(1).execute()
        if res.data:
            print(f"\nTable: {t}")
            print("Keys:",   res.data[0].keys())
            print("Sample:", res.data[0])
        else:
            print(f"\nTable: {t} is empty.")
    except Exception as e:
        print(f"\nError reading {t}: {e}")

print("\n--- Inspecting Component Tables for Linkage ---")
comp_tables = ["cpu", "motherboard", "ram", "gpu"]
for t in comp_tables:
    try:
        res = supabase.table(t).select("*").limit(1).execute()
        if res.data:
            print(f"\nTable: {t}")
            print("Keys:", res.data[0].keys())
    except Exception as e:
        print(f"\nError reading {t}: {e}")

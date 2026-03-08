import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv('backend/.env')

url = os.getenv("MAIN_SUPABASE_URL")
key = os.getenv("MAIN_SUPABASE_KEY")

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
            print("Keys:", res.data[0].keys())
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

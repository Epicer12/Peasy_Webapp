import os
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

# Combined table list for inspecting component prices used by the build calculator
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
            # Standardized formatting for key inspection
            print("Keys:",   res.data[0].keys())
            print("Sample:", res.data[0])
        else:
            print(f"\nTable: {t} is empty.")
    except Exception as e:
        print(f"\nError reading {t}: {e}")

print("\n--- Inspecting Component Tables for Linkage ---")
# Core hardware tables to verify price mapping capabilities
comp_tables = ["cpu", "motherboard", "ram", "gpu"]
for t in comp_tables:
    try:
        res = supabase.table(t).select("*").limit(1).execute()
        if res.data:
            print(f"\nTable: {t}")
            print("Keys:", res.data[0].keys())
    except Exception as e:
        print(f"\nError reading {t}: {e}")

import os
from supabase import create_client
from dotenv import load_dotenv

# Load env variables from backend/.env
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

url = os.getenv("MAIN_SUPABASE_URL")
key = os.getenv("MAIN_SUPABASE_KEY")

if not url or not key:
    print("Error: MAIN_SUPABASE_URL and MAIN_SUPABASE_KEY must be set in .env")
    exit(1)

supabase = create_client(url, key)

def check_overlap(spec_table, current_price_table, spec_col, price_col):
    print(f"\nChecking overlap: {spec_table} vs {current_price_table}")
    # Standardized code from rebase resolution
    specs = supabase.table(spec_table).select(spec_col).execute()
    prices = supabase.table(current_price_table).select(price_col).execute()
    
    spec_names = {item[spec_col].strip().lower() for item in specs.data if item[spec_col]}
    price_names = {item[price_col].strip().lower() for item in prices.data if item[price_col]}
    
    common = spec_names.intersection(price_names)
    print(f"Spec count: {len(spec_names)}")
    print(f"Price count: {len(price_names)}")
    print(f"Overlap count: {len(common)}")

    # Sample printing for debugging
    if len(common) < 5 and len(price_names) > 0:
        print("Sample Specs:", list(spec_names)[:5])
        print("Sample Prices:", list(price_names)[:5])

check_overlap("cpu", "processors_prices", "processor_name", "component_name")
check_overlap("motherboard", "motherboards_prices", "component_name", "component_name")
check_overlap("ram", "memory_prices", "component_name", "component_name")

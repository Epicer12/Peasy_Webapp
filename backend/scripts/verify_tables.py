import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv('backend/.env')

url = os.getenv("MAIN_SUPABASE_URL")
key = os.getenv("MAIN_SUPABASE_KEY")

supabase = create_client(url, key)

tables_to_check = ["motherboard", "cpu_cooler", "case_fans", "fans", "case_fan"]

print("Checking tables...")
for table in tables_to_check:
    try:
        response = supabase.table(table).select("*").limit(1).execute()
        print(f"✅ {table}: Exists")
    except Exception as e:
        print(f"❌ {table}: Error - {e}")

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

try:
    print("Fetching 1 CPU...")
    cpu = supabase.table("cpu").select("*").limit(1).execute()
    if cpu.data:
        print("CPU Keys:", cpu.data[0].keys())
        print("CPU Sample:", cpu.data[0])

    print("\nFetching 1 Motherboard...")
    mobo = supabase.table("motherboard").select("*").limit(1).execute()
    if mobo.data:
        print("Mobo Keys:", mobo.data[0].keys())
        print("Mobo Sample:", mobo.data[0])

except Exception as e:
    print(f"Error: {e}")

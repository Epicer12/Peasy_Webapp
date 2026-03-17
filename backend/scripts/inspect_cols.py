import os
from supabase import create_client
from dotenv import load_dotenv

# Load env variables from backend/.env
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

# Merged environment variable resolution to support both naming conventions
url = os.getenv("SUPABASE_URL") or os.getenv("MAIN_SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("MAIN_SUPABASE_KEY")

if not url or not key:
    print("Error: Supabase credentials not found in env")
    exit(1)

supabase = create_client(url, key)

# Diagnostic logic present in both branches to inspect core hardware table schemas
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

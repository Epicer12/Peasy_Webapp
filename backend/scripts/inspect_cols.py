import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    raise RuntimeError("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set in .env")

supabase = create_client(url, key)

try:
    print("Fetching 1 CPU...")
    cpu = supabase.table("cpu").select("*").limit(1).execute()
    if cpu.data:
        print("CPU Keys:",   cpu.data[0].keys())
        print("CPU Sample:", cpu.data[0])

    print("\nFetching 1 Motherboard...")
    mobo = supabase.table("motherboard").select("*").limit(1).execute()
    if mobo.data:
        print("Mobo Keys:",   mobo.data[0].keys())
        print("Mobo Sample:", mobo.data[0])

except Exception as e:
    print(f"Error: {e}")

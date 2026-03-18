import os
from dotenv import load_dotenv
from supabase import create_client

# Load env variables from backend/.env
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

# Merged environment variable resolution: supports both feature and development branch naming
url = os.getenv("SUPABASE_URL") or os.getenv("MAIN_SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("MAIN_SUPABASE_KEY")

if not url or not key:
    print("Error: Supabase credentials not found in env")
    exit(1)

supabase = create_client(url, key)

name = "AMD Ryzen 7 5700G"
print(f"Checking price for: {name}")

# Kept flexible ILIKE search from both branches to ensure robust hardware verification
res = supabase.table("processors_prices").select("*").ilike("component_name", f"%{name}%").execute()
if res.data:
    for item in res.data:
        print(item)
else:
    print("No item found.")

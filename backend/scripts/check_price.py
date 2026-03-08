import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv('backend/.env')

url = os.getenv("MAIN_SUPABASE_URL")
key = os.getenv("MAIN_SUPABASE_KEY")

supabase = create_client(url, key)

name = "AMD Ryzen 7 5700G" 
print(f"Checking price for: {name}")

# Try exact match or ILIKE
res = supabase.table("processors_prices").select("*").ilike("component_name", f"%{name}%").execute()
if res.data:
    for item in res.data:
        print(item)
else:
    print("No item found.")

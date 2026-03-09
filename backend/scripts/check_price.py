import os
from supabase import create_client

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_KEY")

if not url or not key:
    # Fallback for script execution outside of app context
    url = "https://plsyfhoquwmsmmskrerk.supabase.co"
    key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsc3lmaG9xdXdtc21tc2tyZXJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyMjk5MDQsImV4cCI6MjA4NjgwNTkwNH0.-N_oCCUoYrMU3Ju7HbXdDkuTG9RVo4ugJjQWhQt2ERk"

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

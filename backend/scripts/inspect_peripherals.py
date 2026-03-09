import os
from supabase import create_client

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_KEY")

if not url or not key:
    url = "https://plsyfhoquwmsmmskrerk.supabase.co"
    key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsc3lmaG9xdXdtc21tc2tyZXJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyMjk5MDQsImV4cCI6MjA4NjgwNTkwNH0.-N_oCCUoYrMU3Ju7HbXdDkuTG9RVo4ugJjQWhQt2ERk"

supabase = create_client(url, key)

print("Searching for keyboards in peripherals_prices...")
res = supabase.table("peripherals_prices").select("*").ilike("component_name", "%keyboard%").limit(5).execute()
for item in res.data:
    print(item)

print("Searching for mice in peripherals_prices...")
res = supabase.table("peripherals_prices").select("*").ilike("component_name", "%mouse%").limit(5).execute()
for item in res.data:
    print(item)

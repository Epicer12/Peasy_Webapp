import os
from supabase import create_client

url = "https://plsyfhoquwmsmmskrerk.supabase.co"
key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsc3lmaG9xdXdtc21tc2tyZXJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyMjk5MDQsImV4cCI6MjA4NjgwNTkwNH0.-N_oCCUoYrMU3Ju7HbXdDkuTG9RVo4ugJjQWhQt2ERk"

supabase = create_client(url, key)

tables_to_check = ["cpu", "gpu", "ram", "storage_devices", "power_supplies", "cases", "motherboards", "coolers"]

print("Checking tables...")
for table in tables_to_check:
    try:
        response = supabase.table(table).select("*").limit(1).execute()
        print(f"✅ {table}: Exists")
    except Exception as e:
        print(f"❌ {table}: Error - {e}")

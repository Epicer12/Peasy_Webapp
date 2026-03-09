import os
from supabase import create_client

url = "https://plsyfhoquwmsmmskrerk.supabase.co"
key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsc3lmaG9xdXdtc21tc2tyZXJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyMjk5MDQsImV4cCI6MjA4NjgwNTkwNH0.-N_oCCUoYrMU3Ju7HbXdDkuTG9RVo4ugJjQWhQt2ERk"

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

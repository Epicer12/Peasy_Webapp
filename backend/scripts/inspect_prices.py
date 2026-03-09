import os
from supabase import create_client

url = "https://plsyfhoquwmsmmskrerk.supabase.co"
key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsc3lmaG9xdXdtc21tc2tyZXJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyMjk5MDQsImV4cCI6MjA4NjgwNTkwNH0.-N_oCCUoYrMU3Ju7HbXdDkuTG9RVo4ugJjQWhQt2ERk"

supabase = create_client(url, key)

tables = [
    "processors_prices", 
    "motherboards_prices",
    "memory_prices", 
    "graphic_cards_prices"
]

print("--- Inspecting Price Tables ---")
for t in tables:
    try:
        res = supabase.table(t).select("*").limit(1).execute()
        if res.data:
            print(f"\nTable: {t}")
            print("Keys:", res.data[0].keys())
            print("Sample:", res.data[0])
        else:
            print(f"\nTable: {t} is empty.")
    except Exception as e:
        print(f"\nError reading {t}: {e}")

print("\n--- Inspecting Component Tables for Linkage ---")
comp_tables = ["cpu", "motherboard", "ram", "gpu"]
for t in comp_tables:
    try:
        res = supabase.table(t).select("*").limit(1).execute()
        if res.data:
            print(f"\nTable: {t}")
            print("Keys:", res.data[0].keys())
    except Exception as e:
        print(f"\nError reading {t}: {e}")

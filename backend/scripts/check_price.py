import os
from supabase import create_client
<<<<<<< HEAD

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
=======
from dotenv import load_dotenv

# Load env variables from backend/.env
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

url = os.getenv("MAIN_SUPABASE_URL")
key = os.getenv("MAIN_SUPABASE_KEY")

if not url or not key:
    print("Error: MAIN_SUPABASE_URL and MAIN_SUPABASE_KEY must be set in .env")
    exit(1)

# Initialize Supabase
supabase = create_client(url, key)

# Table list for final datasets
final_tables = [
    "case_fans_final",
    "cases_final",
    "cpu_coolers_final",
    "cpu_final",
    "gpu_final",
    "hdd_final",
    "motherboard_final",
    "psu_final",
    "ram_final",
    "ssd_final"
]

def check_all_final_prices():
    print("\n--- Checking _final Tables Column Names ---")
    for t in final_tables:
        try:
            res = supabase.table(t).select("*").limit(1).execute()
            if res.data:
                cols = [c for c in res.data[0].keys() if 'price' in c.lower()]
                print(f"{t}: {cols}")
            else:
                print(f"{t}: Empty table")
        except Exception as e:
            print(f"Error on {t}: {e}")

def check_single_component(name):
    print(f"\nSearching for component: {name}")
    # Try multiple tables to find the component
    search_results = []
    for t in ["processors_prices", "cpu_final", "gpu_final"]:
        try:
            col = "processor_name" if t == "processors_prices" else "name" if t == "cpu_final" else "model_name"
            res = supabase.table(t).select("*").ilike(col, f"%{name}%").execute()
            if res.data:
                for item in res.data:
                    search_results.append((t, item))
        except:
            continue
    
    if search_results:
        for table, item in search_results:
            print(f"[{table}] Found: {item}")
    else:
        print("No item found.")

if __name__ == "__main__":
    check_all_final_prices()
    
    # Example search
    target = "AMD Ryzen 7 5700G"
    check_single_component(target)
>>>>>>> origin/development

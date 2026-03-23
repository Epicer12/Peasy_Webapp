import os
from supabase import create_client
<<<<<<< HEAD

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_KEY")

if not url or not key:
    url = "https://plsyfhoquwmsmmskrerk.supabase.co"
    key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsc3lmaG9xdXdtc21tc2tyZXJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyMjk5MDQsImV4cCI6MjA4NjgwNTkwNH0.-N_oCCUoYrMU3Ju7HbXdDkuTG9RVo4ugJjQWhQt2ERk"
=======
from dotenv import load_dotenv

# Load env variables from backend/.env
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

url = os.getenv("MAIN_SUPABASE_URL")
key = os.getenv("MAIN_SUPABASE_KEY")

if not url or not key:
    print("Error: MAIN_SUPABASE_URL and MAIN_SUPABASE_KEY must be set in .env")
    exit(1)
>>>>>>> origin/development

supabase = create_client(url, key)

print("Searching for keyboards in peripherals_prices...")
res = supabase.table("peripherals_prices").select("*").ilike("component_name", "%keyboard%").limit(5).execute()
for item in res.data:
    print(item)

print("Searching for mice in peripherals_prices...")
res = supabase.table("peripherals_prices").select("*").ilike("component_name", "%mouse%").limit(5).execute()
for item in res.data:
    print(item)

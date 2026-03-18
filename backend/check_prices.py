import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    raise RuntimeError("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set in .env")

supabase = create_client(url, key)

tables = [
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

for t in tables:
    try:
        res = supabase.table(t).select("*").limit(1).execute()
        if res.data:
            cols = [c for c in res.data[0].keys() if 'price' in c.lower()]
            print(f"{t}: {cols}")
        else:
            print(f"{t}: Empty table")
    except Exception as e:
        print(f"Error on {t}: {e}")

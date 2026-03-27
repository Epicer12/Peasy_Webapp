import os
import sys
from supabase import create_client
from dotenv import load_dotenv

load_dotenv('/Users/jayathmimehansa/Peasy_Webapp/backend/.env')

url = os.environ.get("MAIN_SUPABASE_URL")
key = os.environ.get("MAIN_SUPABASE_KEY")
supabase = create_client(url, key)

try:
    res = supabase.table("user_projects").select("*").limit(1).execute()
    cols = list(res.data[0].keys()) if res.data else []
    with open('/tmp/cols.txt', 'w') as f:
        f.write(",".join(cols))
    print("Cols:", cols)
except Exception as e:
    with open('/tmp/cols.txt', 'w') as f:
        f.write("ERROR: " + str(e))
    print("Error:", e)

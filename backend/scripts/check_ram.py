import os
import json
from supabase import create_client
from dotenv import load_dotenv

load_dotenv('backend/.env')

url = os.getenv("MAIN_SUPABASE_URL")
key = os.getenv("MAIN_SUPABASE_KEY")
supabase = create_client(url, key)
res = supabase.table('ram').select('*').limit(1).execute()
print(res.data[0].keys())

import os
import sys
from supabase import create_client
from dotenv import load_dotenv
import json

load_dotenv('/Users/jayathmimehansa/Peasy_Webapp/backend/.env')

url = os.environ.get("MAIN_SUPABASE_URL")
key = os.environ.get("MAIN_SUPABASE_KEY")
supabase = create_client(url, key)

res = supabase.table("user_projects").select("id, name, components").eq("name", "Budget Efficient Build").execute()
if res.data:
    for proj in res.data:
        print(f"Project: {proj['id']} - {len(proj['components']) if proj['components'] else 0} items")
        print(json.dumps(proj['components']))
        print("----")
else:
    print("No project found.")

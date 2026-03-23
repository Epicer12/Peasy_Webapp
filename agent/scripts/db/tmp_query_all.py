import os
import sys
from supabase import create_client
from dotenv import load_dotenv
import json

load_dotenv('/Users/jayathmimehansa/Peasy_Webapp/backend/.env')

url = os.environ.get("MAIN_SUPABASE_URL")
key = os.environ.get("MAIN_SUPABASE_KEY")
supabase = create_client(url, key)

res = supabase.table("user_projects").select("id, name, components, status").eq("name", "Budget Efficient Build").execute()
if res.data:
    for proj in res.data:
        print(f"Project ID: {proj['id']} - Status: {proj['status']}")
        components = proj['components']
        if components:
            print("Number of components:", len(components))
            for idx, c in enumerate(components):
                if c.get("type") == "assembly_guide":
                    print(f"Component {idx}: ASSEMBLY GUIDE PRESENT")
                else:
                    print(f"Component {idx}: {c}")
        else:
            print("No components.")
        print("-------------")
else:
    print("No project found.")

import os
import sys
from supabase import create_client
from dotenv import load_dotenv

load_dotenv('/Users/jayathmimehansa/Peasy_Webapp/backend/.env')

url = os.environ.get("MAIN_SUPABASE_URL")
key = os.environ.get("MAIN_SUPABASE_KEY")
supabase = create_client(url, key)

pid = '1e21ad86-5707-4a77-9564-4bc51b548bd1'
source_pid = 'f98cf308-163c-4a41-9c32-c8bcb818b5b4'

res = supabase.table("user_projects").select("components").eq("id", pid).execute()
bad_components = res.data[0]['components']

# Extract assembly guide
guide_comp = None
for c in bad_components:
    if c.get('type') == 'assembly_guide':
        guide_comp = c

res2 = supabase.table("user_projects").select("components").eq("id", source_pid).execute()
good_components = res2.data[0]['components']

# Mark bought
for c in good_components:
    c['isBought'] = True

if guide_comp:
    good_components.append(guide_comp)

# Update database
upd = supabase.table("user_projects").update({"components": good_components}).eq("id", pid).execute()
print("Restored successfully. Components count:", len(upd.data[0]['components']))

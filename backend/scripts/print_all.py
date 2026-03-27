import os
from dotenv import load_dotenv
load_dotenv()
from supabase import create_client
sb = create_client(os.getenv('MAIN_SUPABASE_URL'), os.getenv('MAIN_SUPABASE_KEY'))

for tbl in ['ssd_final', 'psu_final']:
    r = sb.table(tbl).select('*').limit(1).execute()
    print(f'\n=== {tbl} ===')
    if r.data:
        # Show ALL columns including null ones
        for k, v in r.data[0].items():
            print(f'  {k} = {repr(v)[:90]}')

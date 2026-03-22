import os
from dotenv import load_dotenv
load_dotenv()
from supabase import create_client
sb = create_client(os.getenv('MAIN_SUPABASE_URL'), os.getenv('MAIN_SUPABASE_KEY'))

for tbl in ['ssd_final', 'psu_final']:
    r = sb.table(tbl).select('*').limit(3).execute()
    print(f'\n=== {tbl} ===')
    for row in r.data[:1]:
        for k, v in row.items():
            if v is not None:
                print(f'  {k}: {repr(v)[:60]}')

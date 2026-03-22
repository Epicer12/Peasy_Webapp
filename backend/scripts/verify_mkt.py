import os
from dotenv import load_dotenv
load_dotenv()
from supabase import create_client
from app.routers.marketplace import standardize_product

sb = create_client(os.getenv('MAIN_SUPABASE_URL'), os.getenv('MAIN_SUPABASE_KEY'))

for cat, tbl in [('ssd', 'ssd_final'), ('psu', 'psu_final'), ('cooler', 'cpu_coolers_final')]:
    r = sb.table(tbl).select('*').limit(3).execute()
    print(f'--- {cat} ({tbl}) ---')
    count = 0
    for row in r.data:
        result = standardize_product(row, tbl, None)
        if result:
            print(f'  name={result["name"]}, brand={result["brand"]}, price={result["actual_price"]}')
            count += 1
    if count == 0:
        print('  No priced results (all items filtered - likely no matching price cols)')

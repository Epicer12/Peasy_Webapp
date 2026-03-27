import os
from dotenv import load_dotenv
load_dotenv()
from supabase import create_client
sb = create_client(os.getenv('MAIN_SUPABASE_URL'), os.getenv('MAIN_SUPABASE_KEY'))

PRICE_COLS = [
    "nanotek_price", "nanotek_price_lkr", "price_nanotek",
    "computerzone_price", "computerzone_price_lkr", "cz_price", "price_computerzone",
    "pc_builders_price", "pc_builders_price_lkr", "price_pcbuilders",
    "winsoft_price", "winsoft_price_lkr", "price_winsoft"
]

r = sb.table('ssd_final').select('*').limit(50).execute()
print(f'Total rows fetched: {len(r.data)}')
priced = 0
for row in r.data:
    for col in PRICE_COLS:
        val = row.get(col)
        if val is not None and val != '' and val != 0:
            print(f"  Found price: id={row.get('id')}, col={col}, val={val}, name={row.get('final_model_name')}")
            priced += 1
            break
print(f'Rows with any shop price: {priced}')

# Also show the first row's full columns 
if r.data:
    first = r.data[0]
    print('\nFirst row all columns:')
    for k,v in first.items():
        print(f'  {k}: {repr(v)[:80]}')

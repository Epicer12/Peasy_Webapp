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

# Fetch SSD0029 through SSD0049
ids = [f'SSD{str(i).zfill(4)}' for i in range(29, 50)]
r = sb.table('ssd_final').select('*').in_('id', ids).execute()

print(f'Fetched {len(r.data)} rows')
for row in r.data:
    prices = {col: row.get(col) for col in PRICE_COLS if row.get(col) is not None}
    print(f"  {row.get('id')}: {row.get('final_model_name')} | prices={prices}")

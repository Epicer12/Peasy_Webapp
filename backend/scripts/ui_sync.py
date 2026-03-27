import os, time, json, requests, random
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from supabase import create_client

load_dotenv('/Users/ayumi/Documents/Peasy_Webapp/backend/.env')
supabase = create_client(os.environ.get('MAIN_SUPABASE_URL'), os.environ.get('MAIN_SUPABASE_KEY'))

def fetch_image(query):
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
    }
    for q in [query, f'{query} hardware', f'{query} transparent png']:
        try:
            url = f"https://www.bing.com/images/search?q={q.replace(' ', '+')}&form=HDRSC2&first=1"
            res = requests.get(url, headers=headers, timeout=10)
            if res.status_code == 200:
                soup = BeautifulSoup(res.text, 'lxml')
                for a in soup.find_all('a', class_='iusc'):
                    m_str = a.get('m')
                    if m_str:
                        img_url = json.loads(m_str).get('murl')
                        if img_url: return img_url
        except: pass
        time.sleep(1)
    return 'NO_IMG_FOUND'

def scrape_category(table, name_col, conditions):
    print(f"\n--- Syncing ALL missing items in {table} ---")
    while True:
        query = supabase.table(table).select("*").is_("image_url", "null")
        
        for cond_type, arg1, arg2 in conditions:
            if cond_type == 'ilike': query = query.ilike(arg1, arg2)
            elif cond_type == 'or': query = query.or_(arg1)
            elif cond_type == 'not_ilike': query = query.not_(arg1, 'ilike', arg2)
            
        items = query.limit(100).execute().data
        if not items:
            print("✅ All visible items in this category now have images.")
            break
            
        print(f"Processing chunk of {len(items)} items matching UI filters...")
        for item in items:
            update_col = 'id' if 'id' in item else name_col
            update_val = item.get(update_col)
            name = item.get(name_col)
            if not name:
                name = f"{item.get('brand', '')} {item.get('model', '')}".strip()
            if not name:
                supabase.table(table).update({"image_url": "NO_IMG_FOUND"}).eq(update_col, update_val).execute()
                continue
            
            print(f"Scraping: {name[:50]}...")
            img = fetch_image(name)
            if img:
                supabase.table(table).update({"image_url": img}).eq(update_col, update_val).execute()
            time.sleep(random.uniform(1.0, 2.0))

categories = [
    ('cable_converter_prices', 'component_name', []),
    ('cable_connector_prices', 'component_name', []),
    ('expansion_cards_networking_prices', 'component_name', []),
    ('desktop_systems_prices', 'component_name', []),
    ('desktop_pcs_prices', 'component_name', []),
    ('all_in_one_systems_prices', 'component_name', []),
    ('monitors_prices', 'component_name', []),
    ('console_handheld_gaming_prices', 'component_name', [('or', 'component_name.ilike.%console%,component_name.ilike.%handheld%,component_name.ilike.%ps5%,component_name.ilike.%playstation%,component_name.ilike.%xbox%,component_name.ilike.%switch%,component_name.ilike.%nintendo%', None), ('not_ilike', 'component_name', '%controller%'), ('not_ilike', 'component_name', '%stand%'), ('not_ilike', 'component_name', '%station%'), ('not_ilike', 'component_name', '%cooling%'), ('not_ilike', 'component_name', '%remote%'), ('not_ilike', 'component_name', '%headset%'), ('not_ilike', 'component_name', '%headphone%')]),
    ('party_box_pricing', 'component_name', [('ilike', 'component_name', '%speaker%')]),
    ('peripherals_prices', 'component_name', [('ilike', 'component_name', '%speaker%')]),
    ('peripherals_prices', 'component_name', [('or', 'component_name.ilike.%headset%,component_name.ilike.%headphone%', None), ('not_ilike', 'component_name', '%speaker%')]),
    ('peripherals_prices', 'component_name', [('ilike', 'component_name', '%mouse%')]),
    ('peripherals_prices', 'component_name', [('ilike', 'component_name', '%keyboard%')]),
    ('os_software_prices', 'component_name', []),
    ('case_fans_final', 'name', []),
    ('cpu_coolers_final', 'model_name', []),
    ('cases_final', 'name', []),
    ('psu_final', 'final_model_name', []),
    ('hdd_final', 'final_model_name', []),
    ('ssd_final', 'final_model_name', []),
    ('gpu_final', 'name', []),
    ('ram_final', 'name', []),
    ('motherboard_final', 'name', []),
    ('cpu_final', 'processor_name', [])
]

for table, name_col, conditions in categories:
    try: scrape_category(table, name_col, conditions)
    except Exception as e: print(f"Error on {table}: {e}")

print("Master UI Sync Complete!")

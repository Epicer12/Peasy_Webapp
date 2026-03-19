import os
import time
from dotenv import load_dotenv
from supabase import create_client, Client
import requests
from bs4 import BeautifulSoup
import re
import json
import random

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(__file__), '../.env'))

url: str = os.environ.get("MAIN_SUPABASE_URL")
key: str = os.environ.get("MAIN_SUPABASE_KEY")

if not url or not key:
    print("Supabase credentials not found in .env")
    exit(1)

supabase: Client = create_client(url, key)

TABLES = [
    "ram_final",
    "cases_final",
    "psu_final",
    "ssd_final",
    "hdd_final",
    "cpu_coolers_final",
    "case_fans_final",
    "os_software_prices",
    "peripherals_prices",
    "console_handheld_gaming_prices",
    "monitors_prices",
    "all_in_one_systems_prices",
    "desktop_pcs_prices",
    "desktop_systems_prices",
    "expansion_cards_networking_prices",
    "cable_connector_prices",
    "cable_converter_prices",
    "party_box_pricing",
    "cpu_final",
    "gpu_final",
    "motherboard_final"
]

def fetch_image_for_query(query: str, fallback_query: str = None) -> str:
    """Uses a custom Bing Images scraper to find the first image URL for a query for free."""
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5"
    }
    
    queries_to_try = [
        query, 
        f"{query} hardware", 
        f"{query} transparent png"
    ]
    if fallback_query:
        queries_to_try.append(fallback_query)
        
    for q in queries_to_try:
        try:
            url = f"https://www.bing.com/images/search?q={q.replace(' ', '+')}&form=HDRSC2&first=1"
            res = requests.get(url, headers=headers, timeout=10)
            
            if res.status_code == 200:
                soup = BeautifulSoup(res.text, "lxml") # Needs lxml to be fast and forgiving
                # Bing stores full res image URLs in an attribute 'm' which is a JSON string
                for a in soup.find_all("a", class_="iusc"):
                    m_str = a.get("m")
                    if m_str:
                        try:
                            m_data = json.loads(m_str)
                            img_url = m_data.get("murl")
                            if img_url:
                                print(f"   [Bing Auto-Scraper] Found image: {img_url}")
                                return img_url
                        except Exception:
                            pass
        except Exception as e:
            print(f"   [Bing Auto-Scraper] Error fetching image for '{q}': {e}")
            
        time.sleep(1.0) # wait before trying fallback search
        
    return None

def main():
    print("Starting automated image fetcher...")
    
    for table in TABLES:
        print(f"\n--- Processing Table: {table} ---")
        
        # Determine the name column. It's usually 'name' but let's be safe.
        # Check if the table has an 'image_url' column by fetching one row.
        try:
            sample = supabase.table(table).select("*").limit(1).execute()
            if not sample.data:
                print(f"Table {table} is empty.")
                continue
                
            first_row = sample.data[0]
            if 'image_url' not in first_row:
                print(f"Adding 'image_url' column to {table} is required. Skipping for now. (You can add it via Supabase dashboard)")
                continue

            name_col = 'name'
            possible_names = ['name', 'processor_name', 'component_name', 'final_model_name', 'model_name']
            for col in possible_names:
                if col in first_row:
                    name_col = col
                    break

            print(f"Using '{name_col}' for search query.")
            print(f"Fetching ALL items for {table} via pagination...")
            
            while True:
                # Request 100 items missing an image_url
                response = supabase.table(table).select("*").is_("image_url", "null").limit(100).execute()
                items = response.data
                
                if not items:
                    print(f"✅ Finished table {table} - no more missing images.")
                    break
                    
                print(f"Processing chunk of {len(items)} missing items in {table}...")
                
                for item in items:
                    update_col = 'id' if 'id' in item else name_col
                    update_val = item.get(update_col)
                    item_name = item.get(name_col)
                
                if not item_name:
                    item_name = f"{item.get('brand', '')} {item.get('model', '')}".strip()
                    if not item_name:
                        print(f"⚠️ Item has no valid name, marking as NO_IMG_FOUND")
                        supabase.table(table).update({"image_url": "NO_IMG_FOUND"}).eq(update_col, update_val).execute()
                        continue
                    
                print(f"🔎 Searching image for: {item_name}...")
                # Smart fallback if the exact name isn't found
                fallback = f"{item.get('brand', '')} {item.get('model', '')}".strip()
                img_url = fetch_image_for_query(item_name, fallback if fallback else None)
                
                if img_url:
                    # Update the database
                    supabase.table(table).update({"image_url": img_url}).eq(update_col, update_val).execute()
                    print(f"✅ Updated {item_name}")
                else:
                    print(f"❌ Could not find image for {item_name}, marking as NO_IMG_FOUND to prevent loops.")
                    supabase.table(table).update({"image_url": "NO_IMG_FOUND"}).eq(update_col, update_val).execute()
                    
                # Sleep to avoid getting banned
                time.sleep(random.uniform(2.0, 4.0))
                
            print(f"✅ Finished top 100 visible items for {table}")
                
        except Exception as e:
            print(f"Error processing table {table}: {e}")

if __name__ == "__main__":
    main()

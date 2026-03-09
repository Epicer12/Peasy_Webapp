from typing import Generator, List
from ..base import BaseCrawler
from ..models import Product
from bs4 import BeautifulSoup
import time

class NanotekCrawler(BaseCrawler):
    def __init__(self):
        super().__init__("https://www.nanotek.lk", "Nanotek")

    def get_categories(self) -> List[dict]:
        """Fetches all categories from the homepage."""
        print("Fetching categories from homepage...")
        response = self.fetch_page(self.base_url)
        if not response:
            return []

        soup = BeautifulSoup(response.content, 'html.parser')
        category_list = []
        
        # Select category items from the sidebar menu
        # Based on HTML structure: <ul class="ty-cat-list"> <li class="ty-catListItem"> <a href="...">
        cat_items = soup.select('ul.ty-cat-list li.ty-catListItem a')
        
        for item in cat_items:
            url = item.get('href')
            title_tag = item.select_one('.ty-catTitle span')
            title = title_tag.get_text(strip=True) if title_tag else "Unknown"
            
            if url:
                category_list.append({
                    "name": title,
                    "url": url,
                    "slug": url.split('/')[-1] # Extract last part of URL as slug
                })
        
        return category_list

    def crawl(self, categories: List[str] = None) -> Generator[Product, None, None]:
        # Fetch all available categories dynamically
        available_categories = self.get_categories()
        print(f"Discovered {len(available_categories)} categories on the site.")

        # Filter if the user requested specific categories
        # Note: 'categories' arg here is a list of user-provided strings. 
        # We check if the user's string is part of the category name or slug.
        targets = []
        if categories:
            for cat_data in available_categories:
                for req_cat in categories:
                    if req_cat.lower() in cat_data['slug'].lower() or req_cat.lower() in cat_data['name'].lower():
                        targets.append(cat_data)
                        break
        else:
            targets = available_categories

        for cat_data in targets:
            slug = cat_data['slug']
            url = cat_data['url']
            cat_name = cat_data['name']
            
            print(f"Crawling category: {cat_name} ({slug})...")
            response = self.fetch_page(url)
            if not response:
                continue

            soup = BeautifulSoup(response.content, 'html.parser')
            products = soup.find_all('li', class_='ty-catPage-productListItem')
            
            print(f"Found {len(products)} products in {cat_name}")

            for p_item in products:
                try:
                    # Link
                    link_tag = p_item.find('a')
                    product_url = link_tag['href'] if link_tag else None

                    # Title
                    title_tag = p_item.find('div', class_='ty-productBlock-title').find('h1')
                    name = title_tag.get_text(strip=True) if title_tag else "Unknown"

                    # Price
                    price_tag = p_item.find('h2', class_='ty-productBlock-price-retail')
                    price_str = price_tag.get_text(strip=True) if price_tag else "0"
                    # Remove commas and convert to float
                    price = float(price_str.replace(',', '').replace('LKR', '').strip())

                    # Availability
                    stock_tag = p_item.find('div', class_='ty-productBlock-specialMsg')
                    stock_status = stock_tag.get_text(strip=True) if stock_tag else "Unknown"

                    yield Product(
                        name=name,
                        category=cat_name,
                        price=price,
                        url=product_url,
                        shop_name=self.shop_name,
                        metadata={
                            "stock_status": stock_status,
                            "slug": slug,
                            "original_category_name": cat_name
                        }
                    )
                except Exception as e:
                    print(f"Error parsing product: {e}")
                    continue
    def scrape_product_details(self, url: str) -> dict:
        response = self.fetch_page(url)
        if not response:
            return {"description": "", "specifications": {}}
        
        soup = BeautifulSoup(response.content, 'html.parser')
        details = {"description": "", "specifications": {}}
        
        # Nanotek specifics - usually in a specific div
        desc_div = soup.select_one('.product-description') or soup.select_one('#description')
        if desc_div:
            details["description"] = desc_div.get_text(strip=True)
            
        # Specs are often in a table or list
        spec_table = soup.select_one('.product-specifications') or soup.select_one('table.table')
        if spec_table:
            specs = {}
            for row in spec_table.find_all('tr'):
                cols = row.find_all(['td', 'th'])
                if len(cols) >= 2:
                    key = cols[0].get_text(strip=True)
                    val = cols[1].get_text(strip=True)
                    specs[key] = val
            details["specifications"] = specs
            
        return details

from typing import Generator, List
from ..base import BaseCrawler
from ..models import Product
from bs4 import BeautifulSoup

class ComputerzoneCrawler(BaseCrawler):
    def __init__(self):
        super().__init__("https://computerzone.lk", "Computerzone")

    def get_categories(self) -> List[dict]:
        """Fetches categories from the homepage sidebar/menu."""
        print("Fetching categories from computerzone.lk...")
        response = self.fetch_page(self.base_url)
        if not response:
            return []

        soup = BeautifulSoup(response.content, 'html.parser')
        category_list = []
        
        # Based on identified structure
        # Categories are in a list with counts, e.g., "Casing (61)"
        cat_links = soup.select('a[href*="/product-category/"]')
        
        seen_urls = set()
        for link in cat_links:
            url = link.get('href')
            name_text = link.get_text(strip=True)
            # Remove trailing counts like "(61)"
            name = name_text.split('(')[0].strip()
            
            if url and url not in seen_urls and name:
                category_list.append({
                    "name": name,
                    "url": url,
                    "slug": url.rstrip('/').split('/')[-1]
                })
                seen_urls.add(url)
        
        return category_list

    def crawl(self, categories: List[str] = None) -> Generator[Product, None, None]:
        available_categories = self.get_categories()
        print(f"Discovered {len(available_categories)} categories on Computerzone.")

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
            url = cat_data['url']
            cat_name = cat_data['name']
            
            print(f"Crawling Computerzone category: {cat_name}...")
            
            page_num = 1
            while url:
                print(f"  - Fetching page {page_num} for {cat_name}...")
                response = self.fetch_page(url)
                if not response:
                    break

                soup = BeautifulSoup(response.content, 'html.parser')
                # Computerzone appears to be WooCommerce with Astra or similar
                products = soup.select('li.product')
                if not products:
                    products = soup.select('.product')
                
                print(f"    Found {len(products)} products on page {page_num}")
                
                if not products:
                    print("    No products found, stopping pagination for this category.")
                    break

                for p_item in products:
                    try:
                        # Title
                        title_tag = p_item.select_one('.woocommerce-loop-product__title') or \
                                    p_item.select_one('.ast-loop-product__title') or \
                                    p_item.select_one('h2') or \
                                    p_item.select_one('h3')
                        
                        if not title_tag: continue
                        name = title_tag.get_text(strip=True)

                        # Link
                        link_tag = p_item.select_one('a.woocommerce-LoopProduct-link') or \
                                   p_item.select_one('a')
                        product_url = link_tag['href'] if link_tag else None

                        # Price
                        # Prices are often in <span class="price">
                        price_tag = p_item.select_one('.price bdi') or \
                                    p_item.select_one('.price .woocommerce-Price-amount') or \
                                    p_item.select_one('.price')
                        
                        price_str = price_tag.get_text(strip=True) if price_tag else "0"
                        
                        # Remove currency symbols, commas and extra text
                        clean_price = price_str.replace(',', '').replace('Rs.', '').replace('රු', '').replace('LKR', '').strip()
                        import re
                        match = re.search(r'(\d+\.?\d*)', clean_price)
                        if match:
                            price = float(match.group(1))
                        else:
                            price = 0.0

                        # Availability
                        stock_tag = p_item.select_one('.ast-shop-product-out-of-stock') or \
                                    p_item.select_one('.out-of-stock')
                        stock_status = "Out of Stock" if stock_tag else "In Stock"

                        yield Product(
                            name=name,
                            category=cat_name,
                            price=price,
                            url=product_url,
                            shop_name=self.shop_name,
                            metadata={
                                "stock_status": stock_status,
                                "original_category_name": cat_name
                            }
                        )
                    except Exception as e:
                        print(f"Error parsing product on Computerzone: {e}")
                        continue
                
                # Find next page
                # WooCommerce standard for next page
                next_link = soup.select_one('a.next')
                if next_link and next_link.get('href'):
                    url = next_link['href']
                    page_num += 1
                else:
                    url = None

    def scrape_product_details(self, url: str) -> dict:
        response = self.fetch_page(url)
        if not response:
            return {"description": "", "specifications": {}}
        
        soup = BeautifulSoup(response.content, 'html.parser')
        details = {"description": "", "specifications": {}}
        
        # Computerzone specifics (WooCommerce)
        desc_div = soup.select_one('#tab-description')
        if desc_div:
            details["description"] = desc_div.get_text(strip=True)
            
        # Specs are usually in the Additional Information tab
        specs = {}
        spec_table = soup.select_one('.woocommerce-product-attributes')
        if spec_table:
            for row in spec_table.select('.woocommerce-product-attributes-item'):
                label = row.select_one('.woocommerce-product-attributes-item__label')
                value = row.select_one('.woocommerce-product-attributes-item__value')
                if label and value:
                    specs[label.get_text(strip=True)] = value.get_text(strip=True)
        
        details["specifications"] = specs
        return details

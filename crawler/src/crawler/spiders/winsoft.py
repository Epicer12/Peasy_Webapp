from typing import Generator, List
from ..base import BaseCrawler
from ..models import Product
from bs4 import BeautifulSoup

class WinsoftCrawler(BaseCrawler):
    def __init__(self):
        super().__init__("https://www.winsoft.lk", "Winsoft")

    def get_categories(self) -> List[dict]:
        """Fetches major categories from the homepage."""
        print("Fetching categories from winsoft.lk...")
        response = self.fetch_page(self.base_url)
        if not response:
            return []

        soup = BeautifulSoup(response.content, 'html.parser')
        category_list = []
        
        # Based on identified structure in read_url_content
        # Categories are in headers or specific links
        cat_links = soup.select('a[href*="/product-category/"]')
        
        seen_urls = set()
        for link in cat_links:
            url = link.get('href')
            name = link.get_text(strip=True)
            
            if url and url not in seen_urls and name:
                # Filter out very short names or non-category links if any
                if len(name) > 2:
                    category_list.append({
                        "name": name,
                        "url": url,
                        "slug": url.rstrip('/').split('/')[-1]
                    })
                    seen_urls.add(url)
        
        return category_list

    def crawl(self, categories: List[str] = None) -> Generator[Product, None, None]:
        available_categories = self.get_categories()
        print(f"Discovered {len(available_categories)} categories on Winsoft.")

        targets = []
        if categories:
            for cat_data in available_categories:
                for req_cat in categories:
                    if req_cat.lower() in cat_data['slug'].lower() or req_cat.lower() in cat_data['name'].lower():
                        targets.append(cat_data)
                        break
        else:
            # Default to some core categories if none specified
            core_keywords = ['core-components', 'laptops', 'desktops', 'peripherals', 'monitors']
            for cat_data in available_categories:
                if any(kw in cat_data['slug'] for kw in core_keywords):
                    targets.append(cat_data)
            
            if not targets: # Fallback
                targets = available_categories[:5]

        for cat_data in targets:
            url = cat_data['url']
            cat_name = cat_data['name']
            
            print(f"Crawling Winsoft category: {cat_name}...")
            
            page_num = 1
            while url:
                print(f"  - Fetching page {page_num} for {cat_name}...")
                response = self.fetch_page(url)
                if not response:
                    break

                soup = BeautifulSoup(response.content, 'html.parser')
                # WooCommerce product list item or Astra theme structure
                products = soup.select('li.product')
                if not products:
                    # Try more generic selectors if li.product fails
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
                                    p_item.select_one('h3') or \
                                    p_item.select_one('h2')
                        
                        if not title_tag: continue
                        name = title_tag.get_text(strip=True)

                        # Link
                        link_tag = p_item.select_one('a.woocommerce-LoopProduct-link') or \
                                   p_item.select_one('a')
                        product_url = link_tag['href'] if link_tag else None

                        # Price
                        # Prices are often in <span class="price">
                        price_tag = p_item.select_one('.price bdi') or \
                                    p_item.select_one('.price span') or \
                                    p_item.select_one('.woocommerce-Price-amount')
                        
                        price_str = price_tag.get_text(strip=True) if price_tag else "0"
                        # Remove currency symbols and formatting
                        clean_price = price_str.replace(',', '').replace('Rs.', '').replace('රු', '').replace('LKR', '').strip()
                        try:
                            price = float(clean_price)
                        except ValueError:
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
                        print(f"Error parsing product on Winsoft: {e}")
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
        
        # Winsoft specifics (WooCommerce)
        desc_div = soup.select_one('.woocommerce-product-details__short-description') or \
                   soup.select_one('#tab-description')
        if desc_div:
            details["description"] = desc_div.get_text(strip=True)
            
        # Specs area - sometimes in a table in Additional Information tab
        # or as a list in the description
        specs = {}
        spec_table = soup.select_one('.woocommerce-product-attributes')
        if spec_table:
            for row in spec_table.select('.woocommerce-product-attributes-item'):
                label = row.select_one('.woocommerce-product-attributes-item__label')
                value = row.select_one('.woocommerce-product-attributes-item__value')
                if label and value:
                    specs[label.get_text(strip=True)] = value.get_text(strip=True)
        
        # Fallback to parsing headers and text if no table (as seen in some chunks)
        if not specs:
            desc_content = soup.select_one('#tab-description')
            if desc_content:
                # Simple extraction of key-value pairs if they look like "Key: Value" or similar
                # For Winsoft, they often use headers then text
                current_header = None
                for elem in desc_content.find_all(['h3', 'h6', 'p', 'li']):
                    text = elem.get_text(strip=True)
                    if elem.name in ['h3', 'h6']:
                        current_header = text
                    elif current_header and text:
                        specs[current_header] = text
                        current_header = None # Reset to avoid repeated usage if multiple p/li

        details["specifications"] = specs
        return details

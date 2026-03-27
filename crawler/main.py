import argparse
import sys
import os

# Add src to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

from src.crawler.spiders.mock import MockCrawler
from src.crawler.spiders.nanotek import NanotekCrawler
from src.crawler.spiders.winsoft import WinsoftCrawler
from src.crawler.spiders.pcbuilders import PCBuildersCrawler
from src.crawler.spiders.computerzone import ComputerzoneCrawler
from src.storage.json_store import JSONStorage

def main():
    parser = argparse.ArgumentParser(description="Sri Lanka PC Parts Crawler")
    parser.add_argument("--spider", choices=["all", "mock", "nanotek", "winsoft", "pcbuilders", "computerzone"], default="mock", help="Which spider to run")
    parser.add_argument("--output", choices=["json", "sqlite"], default="json", help="Storage backend")
    parser.add_argument("--category", nargs="+", help="Optional: specific categories to crawl")
    parser.add_argument("--details", action="store_true", help="Fetch full product details (slower)")
    
    args = parser.parse_args()

    # Spider Registry
    spiders = {
        "nanotek": NanotekCrawler(),
        "winsoft": WinsoftCrawler(),
        "pcbuilders": PCBuildersCrawler(),
        "computerzone": ComputerzoneCrawler(),
    }

    if args.spider == "mock":
        active_spiders = [MockCrawler()]
    elif args.spider == "all":
        active_spiders = list(spiders.values())
    else:
        active_spiders = [spiders[args.spider]]

    # Select Storage
    if args.output == "json":
        storage = JSONStorage()
    else:
        print("SQLite storage not implemented yet.")
        return

    all_products = []
    
    for spider in active_spiders:
        print(f"--- Starting crawl with {spider.shop_name} spider ---")
        try:
            for product in spider.crawl(categories=args.category):
                if args.details and product.url:
                    print(f"[{spider.shop_name}] Fetching details for: {product.name[:40]}...")
                    details = spider.scrape_product_details(product.url)
                    product.description = details.get("description", "")
                    product.specifications = details.get("specifications", {})
                
                try:
                    # Clean terminal output
                    print(f"[{spider.shop_name}] Found: {product.name[:60]}... - {product.price} LKR")
                except:
                    print(f"[{spider.shop_name}] Found: Product (name hidden) - {product.price} LKR")
                all_products.append(product)
        except Exception as e:
            print(f"Crawl failed for {spider.shop_name}: {e}")

    print(f"\nCrawling finished. Aggregate count: {len(all_products)} products.")
    storage.save(all_products)
    print("Data saved to storage. Done.")

if __name__ == "__main__":
    main()

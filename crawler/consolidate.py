
import argparse
import sys
import os
from datetime import datetime

# Add src to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

# Import spiders
from src.crawler.spiders.nanotek import NanotekCrawler
from src.crawler.spiders.winsoft import WinsoftCrawler
from src.crawler.spiders.pcbuilders import PCBuildersCrawler
from src.crawler.spiders.computerzone import ComputerzoneCrawler

# Import processing
from src.processing.aggregator import consolidate_products
from src.processing.exporter import export_to_csv

def main():
    parser = argparse.ArgumentParser(description="Sri Lanka PC Parts Crawler & Consolidator")
    parser.add_argument("--category", nargs="+", help="Optional: specific categories to crawl")
    parser.add_argument("--output-dir", default="data/consolidated_csvs", help="Output directory for CSVs")
    parser.add_argument("--skip-crawl", action="store_true", help="Skip crawling and just consolidate (if data exists in memory - effectively useless here without persistence, but kept for structure)")
    
    args = parser.parse_args()
    
    # Initialize Spiders
    spiders = [
        NanotekCrawler(),
        WinsoftCrawler(),
        PCBuildersCrawler(),
        ComputerzoneCrawler()
    ]
    
    all_products = []
    
    # 1. Crawl Phase
    if not args.skip_crawl:
        print(f"--- Starting Full Crawl at {datetime.now()} ---")
        for spider in spiders:
            print(f"\n>>> Running {spider.shop_name} Spider")
            try:
                # Crawl returns a generator
                for product in spider.crawl(categories=args.category):
                    all_products.append(product)
                    # Optional: Print progress
                    # print(f"  Fetched: {product.name[:30]}...")
            except Exception as e:
                print(f"!!! Error running {spider.shop_name}: {e}")
                
        print(f"\n--- Crawl Finished. Total products fetched: {len(all_products)} ---")
    else:
        print("Skipping crawl (Note: This script currently doesn't load from disk, so product list will be empty unless you modify it to load JSON).")
    
    # 2. Consolidation Phase
    if all_products:
        print("\n--- Starting Consolidation ---")
        consolidated_data = consolidate_products(all_products)
        print(f"Consolidated into {len(consolidated_data)} categories.")
        
        # 3. Export Phase
        print(f"\n--- Exporting to {args.output_dir} ---")
        export_to_csv(consolidated_data, args.output_dir)
        print("--- Done ---")
    else:
        print("No products to consolidate.")

if __name__ == "__main__":
    main()

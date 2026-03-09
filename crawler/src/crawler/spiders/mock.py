from typing import Generator, List
from ..base import BaseCrawler
from ..models import Product
import random
import time

class MockCrawler(BaseCrawler):
    def __init__(self):
        super().__init__("http://mock-shop.local", "MockShop")

    def crawl(self, categories: List[str] = None) -> Generator[Product, None, None]:
        categories = categories or ["CPU", "GPU", "RAM"]
        print(f"Mock crawling categories: {categories}")
        
        for category in categories:
            for i in range(5):  # Generate 5 products per category
                yield Product(
                    name=f"Mock {category} Model {i+1}",
                    category=category,
                    price=random.randint(10000, 200000),
                    url=f"http://mock-shop.local/product/{category}/{i+1}",
                    shop_name=self.shop_name
                )
                time.sleep(0.1)

from abc import ABC, abstractmethod
from typing import List, Generator
from .models import Product
import requests
import time
import random

class BaseCrawler(ABC):
    def __init__(self, base_url: str, shop_name: str, delay: int = 1):
        self.base_url = base_url
        self.shop_name = shop_name
        self.delay = delay
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9',
        })

    def _sleep(self):
        """Respectful delay between requests."""
        time.sleep(self.delay + random.uniform(0, 1))

    def fetch_page(self, url: str) -> requests.Response:
        """Fetches a page with error handling and delay."""
        self._sleep()
        try:
            response = self.session.get(url, timeout=10)
            response.raise_for_status()
            return response
        except requests.RequestException as e:
            print(f"Error fetching {url}: {e}")
            return None

    @abstractmethod
    def crawl(self, categories: List[str] = None) -> Generator[Product, None, None]:
        """Generator that yields Product objects."""
        pass

    def scrape_product_details(self, url: str) -> dict:
        """
        Fetches the product page and extracts details.
        Returns a dict with 'description' and 'specifications'.
        """
        # Default implementation returns empty details
        return {
            "description": "",
            "specifications": {}
        }

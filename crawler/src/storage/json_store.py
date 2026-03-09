import json
import os
from typing import List
from .interface import StorageInterface
from ..crawler.models import Product

class JSONStorage(StorageInterface):
    def __init__(self, filepath: str = "data/products.json"):
        self.filepath = filepath
        # Ensure directory exists
        os.makedirs(os.path.dirname(self.filepath), exist_ok=True)

    def save(self, products: List[Product]):
        data = [p.to_dict() for p in products]
        try:
            with open(self.filepath, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=4, ensure_ascii=False)
            print(f"Saved {len(products)} products to {self.filepath}")
        except IOError as e:
            print(f"Error saving to JSON: {e}")

    def load(self) -> List[dict]:
        if not os.path.exists(self.filepath):
            return []
        try:
            with open(self.filepath, 'r', encoding='utf-8') as f:
                return json.load(f)
        except (IOError, json.JSONDecodeError) as e:
            print(f"Error loading JSON: {e}")
            return []

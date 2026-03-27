from abc import ABC, abstractmethod
from typing import List
from ..crawler.models import Product

class StorageInterface(ABC):
    @abstractmethod
    def save(self, products: List[Product]):
        """Save a list of products to the storage medium."""
        pass

    @abstractmethod
    def load(self) -> List[dict]:
        """Load products from the storage medium."""
        pass

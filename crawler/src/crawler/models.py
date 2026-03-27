from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

@dataclass
class Product:
    name: str
    category: str
    price: float
    url: str
    shop_name: str
    currency: str = "LKR"
    description: str = ""
    specifications: dict = field(default_factory=dict)
    # Optional metadata like specs or brand
    metadata: dict = field(default_factory=dict)
    last_updated: datetime = field(default_factory=datetime.now)

    def to_dict(self):
        return {
            "name": self.name,
            "category": self.category,
            "price": self.price,
            "currency": self.currency,
            "url": self.url,
            "shop_name": self.shop_name,
            "description": self.description,
            "specifications": self.specifications,
            "metadata": self.metadata,
            "last_updated": self.last_updated.isoformat()
        }

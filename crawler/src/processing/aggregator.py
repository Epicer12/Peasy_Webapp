from typing import List, Dict
from collections import defaultdict
from ..crawler.models import Product
from .normalizer import normalize_name
from .category_mapper import normalize_category

def consolidate_products(products: List[Product]) -> Dict[str, List[Dict]]:
    """
    Groups products by normalized name and category, then consolidates them into rows.
    Returns: Dict[Category, List[RowDict]]
    """
    
    # Group by normalized name
    # Dict[str, List[Product]]
    grouped_products = defaultdict(list)
    
    for product in products:
        norm_name = normalize_name(product.name)
        if not norm_name:
            continue
        grouped_products[norm_name].append(product)
        
    # Process groups into rows
    # We need to assign each group to a category
    
    consolidated_data = defaultdict(list)
    
    for norm_name, product_list in grouped_products.items():
        if not product_list:
            continue
            
        # Determine canonical category
        # Use simple voting or priority?
        # Let's check all products in the group and see which mapped category is most common
        raw_categories = [p.category for p in product_list]
        mapped_categories = [normalize_category(c) for c in raw_categories]
        
        # Find most frequent mapped category
        from collections import Counter
        canonical_category = Counter(mapped_categories).most_common(1)[0][0]
        
        # If the canonical category is "Uncategorized", try to infer from product name
        if canonical_category == "Uncategorized":
            from .category_mapper import infer_category_from_name
            canonical_category = infer_category_from_name(product_list[0].name)
        
        # Determine display name (use the shortest original name or the first one)
        # Often shorter names are cleaner "AMD Ryzen 5 5600X" vs "AMD Ryzen 5 5600X (Box)"
        display_name = min(product_list, key=lambda p: len(p.name)).name
        
        # Create row
        row = {
            "Component Name": display_name,
            "Normalized Name": norm_name # validation purpose
        }
        
        # Populate shop data
        # We need to ensure we don't have duplicates for the same shop in the same group
        # If we do, we take the cheaper one? or the one in stock?
        # Let's take the one in stock, or the first one.
        
        shop_map = {}
        for p in product_list:
            if p.shop_name not in shop_map:
                shop_map[p.shop_name] = p
            else:
                # Conflict resolution: prefer In Stock
                existing = shop_map[p.shop_name]
                new_stock = p.metadata.get('stock_status', '').lower()
                old_stock = existing.metadata.get('stock_status', '').lower()
                
                if "in stock" in new_stock and "in stock" not in old_stock:
                    shop_map[p.shop_name] = p
        
        for p in shop_map.values():
            shop = p.shop_name
            row[f"{shop} Price"] = p.price
            row[f"{shop} URL"] = p.url
            row[f"{shop} Status"] = p.metadata.get('stock_status', 'Unknown')
            
        consolidated_data[canonical_category].append(row)
        
    return consolidated_data

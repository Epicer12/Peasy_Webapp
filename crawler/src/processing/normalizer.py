
import re

def normalize_name(name: str) -> str:
    """
    Normalizes a product name for matching purposes.
    - Lowercase
    - Removes content in parenthesis () or brackets []
    - Removes common keywords like "warranty", "tray", "box"
    - Removes whitespace
    - Removes price-like patterns if any (though usually not in name)
    """
    if not name:
        return ""
    
    # Lowercase
    norm = name.lower()
    
    # Remove content in parenthesis and brackets
    norm = re.sub(r'\([^)]*\)', '', norm)
    norm = re.sub(r'\[[^]]*\]', '', norm)
    
    # Remove specific keywords
    keywords = [
        "warranty", "years", "year", "months", "month",
        "tray", "box", "pack", "series", "edition",
        "lkr", "rs.", "roupies",
        # New keywords for better matching
        "processor", "desktop", "gaming", "cpu", "gen",
        "cores", "core", "threads", "thread",
        "cache", "ghz", "mhz", "upto", "up to", "used",
        "with", "cooler", "promo", "offer"
    ]
    for kw in keywords:
        norm = norm.replace(kw, "")
    
    # Remove non-alphanumeric characters (keep numbers and letters)
    # This helps with "Ryzen 5" vs "Ryzen-5"
    norm = re.sub(r'[^a-z0-9]', '', norm)
    
    return norm


def normalize_category(category: str) -> str:
    """
    Maps diverse category names to a standard set.
    """
    if not category:
        return "Uncategorized"
    
    cat_lower = category.lower().strip()
    
    # Processors - catch all processor-related categories including brand names
    if any(x in cat_lower for x in ["processor", "ryzen", "intel", "amd", "cpu"]):
        return "Processors"
        
    # Motherboards
    if "motherboard" in cat_lower or "mobo" in cat_lower:
        return "Motherboards"
        
    # Graphics Cards
    if any(x in cat_lower for x in ["vga", "graphics card", "gpu", "graphic card", "video card", "rtx", "gtx", "radeon"]):
        return "Graphics Cards"
        
    # Memory (RAM)
    if any(x in cat_lower for x in ["ram", "memory", "ddr"]):
        return "Memory"
        
    # Storage
    if any(x in cat_lower for x in ["ssd", "hdd", "hard drive", "storage", "m.2", "nvme", "sata"]):
        return "Storage"
        
    # Power Supply
    if any(x in cat_lower for x in ["power supply", "psu"]):
        return "Power Supply"
        
    # Casing
    if any(x in cat_lower for x in ["casing", "chassis", "case"]) and "laptop" not in cat_lower:
        return "Casing"
        
    # Cooling
    if any(x in cat_lower for x in ["cooler", "cooling", "liquid", "air"]) and "air" not in cat_lower:
        return "Cooling"
        
    # Monitors
    if "monitor" in cat_lower:
        return "Monitors"
        
    # Laptops
    if "laptop" in cat_lower:
        return "Laptops"
        
    # Accessories / Peripherals (Broad Catch-all)
    if any(x in cat_lower for x in ["keyboard", "mouse", "headset", "speaker", "ups", "webcam", "peripheral"]):
        return "Peripherals"
    
    # Core Components - Winsoft's catch-all category, map to Uncategorized
    # so products get categorized by their actual names
    if "core component" in cat_lower:
        return "Uncategorized"

    # Default: return Title Cased original if no match
    return category.title()


def infer_category_from_name(product_name: str) -> str:
    """
    Infers category from product name when the category is generic/uncategorized.
    Used for products from catch-all categories like "Core Components".
    """
    name_lower = product_name.lower()
    
    # Processors
    if any(x in name_lower for x in ["processor", "ryzen", "intel core", "amd", "cpu", "pentium"]):
        return "Processors"
    
    # Motherboards
    if "motherboard" in name_lower or "mobo" in name_lower:
        return "Motherboards"
    
    # Graphics Cards
    if any(x in name_lower for x in ["graphics card", "geforce", "rtx", "gtx", "radeon", "vga"]):
        return "Graphics Cards"
    
    # Memory (RAM) - include laptop RAM
    if any(x in name_lower for x in ["ram", "memory", "ddr", "so-dimm"]):
        return "Memory"
    
    # Storage - include NAS drives
    if any(x in name_lower for x in ["ssd", "hdd", "hard drive", "nvme", "m.2", "nas"]):
        return "Storage"
    
    # Power Supply - include UPS
    if any(x in name_lower for x in ["power supply", "psu", "watt", "80 plus", "80+", "ups", "surge"]):
        return "Power Supply"
    
    # Casing
    if any(x in name_lower for x in ["casing", "case", "tower", "chassis"]) and "laptop" not in name_lower:
        return "Casing"
    
    # Cooling - include all coolers
    if any(x in name_lower for x in ["cooler", "cooling", "liquid", "aio", "fan", "assassin"]):
        return "Cooling"
    
    # Networking / Peripherals
    if any(x in name_lower for x in ["network card", "ethernet", "wifi", "bluetooth"]):
        return "Expansion Cards  Networking"
    
    # External Storage / Peripherals
    if any(x in name_lower for x in ["external", "portable", "usb", "pen drive"]):
        return "Peripherals"
    
    # Default
    return "Uncategorized"

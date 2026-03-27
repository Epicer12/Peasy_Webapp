import hashlib
from typing import Optional, Dict, Any

# Pexels direct image URL helper
def _px(photo_id: int) -> str:
    return f"https://images.pexels.com/photos/{photo_id}/pexels-photo-{photo_id}.jpeg?auto=compress&cs=tinysrgb&w=800"

# Unsplash image URL helper
def _us(photo_id: str) -> str:
    return f"https://images.unsplash.com/{photo_id}?auto=format&fit=crop&q=80&w=800"

# Note: The 'rotate' value is in degrees (90, -90, 180, 0)
# 'Anticlockwise 90' = -90
# 'Clockwise' = 90

IMAGE_VAULT = {
    "cpu": {
        "intel": [
            {"id": 11272008, "rotate": 0},
            {"id": 5553596, "rotate": 0}
        ],
        "amd": [
            {"id": 32300577, "rotate": 0}
        ]
    },
    "gpu": {
        "nvidia": [
            {"id": 8622912, "rotate": 0},
            {"id": 4581902, "rotate": 0}
        ],
        "gigabyte": [
            {"id": 33890720, "rotate": 0}
        ]
    },
    "motherboard": {
        "asus": [
            {"id": 5553597, "rotate": -90},
            {"id": 5766819, "rotate": -90},
            {"id": 27598325, "rotate": -90}
        ],
        "gigabyte": [
            {"id": 33402765, "rotate": 0},
            {"id": 33890721, "rotate": -90},
            {"id": 18286300, "rotate": 90}
        ],
        "default": [
            {"id": 26443417, "rotate": 0}
        ]
    },
    "ram": {
        "default": [
            {"id": "photo-1562976540-1502c2145186", "rotate": 0}
        ]
    },
    "ssd": {
        "default": [
            {"id": 28666524, "rotate": 0},
            {"id": 35984425, "rotate": 0}
        ]
    },
    "hdd": {
        "default": [
            {"id": 4526279, "rotate": 0},
            {"id": 32892856, "rotate": 0}
        ]
    },
    "psu": {
        "default": [
            {"id": 35147159, "rotate": 0},
            {"id": 33890758, "rotate": 0},
            {"id": 29185662, "rotate": 0},
            {"id": 33693709, "rotate": 0}
        ]
    },
    "case": {
        "default": [
            {"id": 36619505, "rotate": 0},
            {"id": 33975264, "rotate": 0},
            {"id": 28190154, "rotate": 0},
            {"id": 31857028, "rotate": 0},
            {"id": 33444592, "rotate": 0}
        ]
    },
    "cooler": {
        "aio": [
            {"id": 35223430, "rotate": 0},
            {"id": 33797658, "rotate": 0},
            {"id": 33693710, "rotate": 0}
        ],
        "air": [
            {"id": 33644939, "rotate": 0},
            {"id": 33644806, "rotate": 0},
            {"id": 33547694, "rotate": 0}
        ]
    },
    "case_fan": {
        "arctic": [
            {"id": 34338615, "rotate": 0}
        ],
        "default": [
            {"id": 28381527, "rotate": 0},
            {"id": 34241719, "rotate": 0},
            {"id": 34006672, "rotate": 0},
            {"id": 29177040, "rotate": 0},
            {"id": 28657039, "rotate": 0}
        ]
    }
}

# Generic hardware fallback (Motherboard/Tech vibe)
_FALLBACK = {"url": _px(26443417), "rotate": 0}

def get_component_image(category: str, name: str) -> Dict[str, Any]:
    """Returns a deterministic high-quality hardware image with rotation metadata."""
    cat = category.lower()
    name_lower = name.lower()

    # Map category IDs to vault keys
    cat_key = "default"
    if "cooler" in cat or "cooling" in cat:
        cat_key = "cooler"
    elif "fan" in cat:
        cat_key = "case_fan"
    elif any(k in cat for k in ["cpu", "processor"]):
        cat_key = "cpu"
    elif any(k in cat for k in ["gpu", "graphic", "video"]):
        cat_key = "gpu"
    elif any(k in cat for k in ["motherboard", "mobo"]):
        cat_key = "motherboard"
    elif any(k in cat for k in ["ram", "memory"]):
        cat_key = "ram"
    elif "ssd" in cat or "m.2" in cat or "nvme" in cat:
        cat_key = "ssd"
    elif "hdd" in cat or "hard drive" in cat:
        cat_key = "hdd"
    elif any(k in cat for k in ["storage"]):
        cat_key = "ssd"
    elif "psu" in cat or "power" in cat:
        cat_key = "psu"
    elif "case" in cat or "housing" in cat:
        cat_key = "case"

    if cat_key not in IMAGE_VAULT:
        return _FALLBACK

    # Specific sub-cat detection
    sub_key = "default"
    if cat_key == "cooler":
        if any(k in name_lower for k in ["liquid", "aio", "water", "x ii"]):
            sub_key = "aio"
        else:
            sub_key = "air"
    else:
        # Brand detection for other categories
        if "nvidia" in name_lower or "geforce" in name_lower or "rtx" in name_lower:
            sub_key = "nvidia"
        elif "amd" in name_lower or "ryzen" in name_lower or "radeon" in name_lower:
            sub_key = "amd"
        elif "intel" in name_lower or "core" in name_lower:
            sub_key = "intel"
        elif "asus" in name_lower or "rog" in name_lower or "tuf" in name_lower or "strix" in name_lower:
            sub_key = "asus"
        elif "msi" in name_lower:
            sub_key = "msi"
        elif "gigabyte" in name_lower or "aorus" in name_lower:
            sub_key = "gigabyte"
        elif "arctic" in name_lower:
            sub_key = "arctic"

    # Get the collection
    # If sub-key not found (e.g. no 'nvidia' key for a category), use 'default'
    collection = IMAGE_VAULT[cat_key].get(sub_key, IMAGE_VAULT[cat_key].get("default", []))

    if not collection:
        # Final safety check: if a category exists but sub-collection is empty (like CPU with no brand match)
        # Use first available collection in that category if possible, or fallback
        for key in IMAGE_VAULT[cat_key]:
            if IMAGE_VAULT[cat_key][key]:
                collection = IMAGE_VAULT[cat_key][key]
                break
        
        if not collection:
            return _FALLBACK

    # Deterministic index
    name_hash = int(hashlib.md5(name.encode()).hexdigest(), 16)
    idx = name_hash % len(collection)
    selected = collection[idx]
    
    if isinstance(selected["id"], str):
        url = _us(selected["id"])
    else:
        url = _px(selected["id"])
        
    return {
        "url": url,
        "rotate": selected["rotate"]
    }

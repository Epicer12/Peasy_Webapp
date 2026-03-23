from typing import Dict, List
import re

# Real price columns to check, in order of priority (or we pick best)
PRICE_COLS = [
    "nanotek_price", "nanotek_price_lkr", "price_nanotek",
    "computerzone_price", "computerzone_price_lkr", "cz_price", "price_computerzone",
    "pc_builders_price", "pc_builders_price_lkr", "price_pcbuilders",
    "winsoft_price", "winsoft_price_lkr", "price_winsoft"
]

def get_local_price(item: Dict) -> float:
    prices = []
    for col in PRICE_COLS:
        val = item.get(col)
        if val:
            try:
                if isinstance(val, str):
                    val = re.sub(r'[^0-9.]', '', val)
                f_val = float(val)
                if f_val > 0:
                    prices.append(f_val)
            except:
                pass
    return min(prices) if prices else 0.0

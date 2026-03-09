
import csv
import os
from typing import List, Dict

def export_to_csv(data: Dict[str, List[Dict]], output_dir: str):
    """
    Exports consolidated data to CSV files, one per category.
    """
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        
    for category, rows in data.items():
        if not rows:
            continue
            
        # Sanitize filename
        safe_cat = "".join(x for x in category if x.isalnum() or x in " -_").strip()
        filename = os.path.join(output_dir, f"{safe_cat}.csv")
        
        # Determine all columns dynamically
        # Start with fixed columns
        fieldnames = ["Component Name", "Normalized Name"]
        
        # Collect all other keys from all rows (e.g. shop specific columns)
        other_keys = set()
        for row in rows:
            for key in row.keys():
                if key not in fieldnames:
                    other_keys.add(key)
        
        # Sort other keys for consistent output: Shop1 Price, Shop1 Status, Shop1 URL...
        # A simple sort might group by Shop Name if naming is consistent
        sorted_other_keys = sorted(list(other_keys))
        
        fieldnames.extend(sorted_other_keys)
        
        with open(filename, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(rows)
            
        print(f"Exported {len(rows)} products to {filename}")

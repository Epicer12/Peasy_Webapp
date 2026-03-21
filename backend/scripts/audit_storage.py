import os
import json
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

def audit_storage():
    url = os.getenv("WARRANTY_SUPABASE_URL")
    key = os.getenv("WARRANTY_SUPABASE_KEY")
    
    if not url or not key:
        print("Error: WARRANTY_SUPABASE_URL or WARRANTY_SUPABASE_KEY not set.")
        return

    supabase = create_client(url, key)
    
    bucket_id = "warranties"
    print(f"--- Full Audit of Bucket: {bucket_id} ---")
    
    def list_recursive(path=""):
        try:
            res = supabase.storage.from_(bucket_id).list(path)
            for item in res:
                full_path = f"{path}/{item['name']}".strip("/")
                if 'id' not in item or item['id'] is None: # Folder-like item
                    print(f"Folder: {full_path}")
                    list_recursive(full_path)
                else:
                    print(f"File: {full_path} (Size: {item.get('metadata', {}).get('size', 'unknown')}, MIME: {item.get('metadata', {}).get('mimetype', 'unknown')})")
        except Exception as e:
            print(f"  Error listing {path}: {e}")

    list_recursive()

if __name__ == "__main__":
    audit_storage()

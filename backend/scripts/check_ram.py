import os
import json # Kept from feature branch
from dotenv import load_dotenv
from supabase import create_client

# Load env variables from backend/.env
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

# Merged environment variable resolution to support both naming conventions
url = os.getenv("SUPABASE_URL") or os.getenv("MAIN_SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("MAIN_SUPABASE_KEY")

if not url or not key:
    print("Error: Supabase credentials not found in env")
    exit(1)

supabase = create_client(url, key)

# Diagnostic command present in both branches to verify RAM table schema
res = supabase.table('ram').select('*').limit(1).execute()
if res.data:
    print("RAM Table Columns:", res.data[0].keys())
else:
    print("RAM table is empty.")

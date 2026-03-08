import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv('backend/.env')

url = os.getenv("MAIN_SUPABASE_URL")
key = os.getenv("MAIN_SUPABASE_KEY")

if not url or not key:
    print("Error: MAIN_SUPABASE credentials not found in environment variables.")
    exit(1)

supabase = create_client(url, key)

try:
    # Try to fetch one row from 'components' table to see if it exists and what columns it has
    response = supabase.table("components").select("*").limit(1).execute()
    print("Successfully connected to 'components' table.")
    if response.data:
        print("Sample data:", response.data[0])
        print("Columns:", response.data[0].keys())
    else:
        print("Table 'components' exists but is empty.")
        
except Exception as e:
    print(f"Error accessing 'components' table: {e}")
    # Try listing all tables if possible (requires specific permissions usually not available to service role key directly via API without rpc)
    # Alternatively try 'parts' or 'products'
    try:
        response = supabase.table("parts").select("*").limit(1).execute()
        print("Found 'parts' table instead.")
        if response.data:
             print("Sample data:", response.data[0])
    except:
        print("Could not find 'components' or 'parts' table.")


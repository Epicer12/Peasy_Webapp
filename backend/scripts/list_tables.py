import os
import asyncio
from dotenv import load_dotenv
from app.dependencies import get_warranty_supabase

load_dotenv()

async def list_tables():
    try:
        supabase = get_warranty_supabase()
        # Newer supabase-py might not have a direct list_tables, 
        # but we can try common ones or use a raw RPC/query if enabled.
        # Alternatively, we can try to query common tables or use postgrest info.
        
        # Let's try to query the REST explorer or similar if possible.
        # Most reliable way without custom RPC is to try and trigger an error 
        # that lists tables, or just check the schema.
        
        # We'll try to use a query that fails or checks system tables if permitted.
        res = supabase.rpc("get_tables").execute() # If they have this
        print(f"Tables RPC: {res}")
    except Exception as e:
        print(f"RPC Error: {e}")
        # Fallback: just try to guess or use the error from before.

if __name__ == "__main__":
    asyncio.run(list_tables())

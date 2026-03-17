import asyncio
import os
from dotenv import load_dotenv

# Load env variables explicitly
load_dotenv('backend/.env')

# Mocking call for testing
from app.services.vision_service import search_supabase_model

async def test_lookups():
    test_cases = [
        ("GPU", "RTX 3080"),
        ("CPU", "Ryzen 5 5600X"),
        ("RAM", "Vengeance LPX"),
    ]

    print("--- Pass 1: Filling Cache ---")
    for comp_type, search_query in test_cases:
        start = asyncio.get_event_loop().time()
        result = await search_supabase_model(comp_type, search_query)
        end = asyncio.get_event_loop().time()
        status = f"✅ {result['matched_model']}" if result else "❌ No Match"
        print(f"[{comp_type}] {search_query} -> {status} ({end-start:.3f}s)")

    print("\n--- Pass 2: Cache Hits ---")
    for comp_type, search_query in test_cases:
        start = asyncio.get_event_loop().time()
        result = await search_supabase_model(comp_type, search_query)
        end = asyncio.get_event_loop().time()
        status = f"✅ {result['matched_model']}" if result else "❌ No Match"
        print(f"[{comp_type}] {search_query} -> {status} ({end-start:.3f}s)")

if __name__ == "__main__":
    asyncio.run(test_lookups())

import asyncio
import os
import base64
from app.services.openrouter_service import extract_warranty_info

async def main():
    print("Starting isolation test...")
    # Create a dummy image content
    dummy_image_content = b"fake image content"
    
    print("Calling extract_warranty_info...")
    try:
        # This will likely fail with an API error since the content is fake, 
        # but it shouldn't CRASH the process with an access violation.
        result = await extract_warranty_info(dummy_image_content)
        print(f"Result: {result}")
    except Exception as e:
        print(f"Caught exception: {e}")
    print("Test finished.")

if __name__ == "__main__":
    asyncio.run(main())

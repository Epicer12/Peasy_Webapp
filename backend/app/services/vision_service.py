import os
import io
import base64
import json
import httpx
import asyncio
from PIL import Image
from openai import AsyncOpenAI

# Configuration
VISION_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
VISION_BASE_URL = "https://openrouter.ai/api/v1"
VISION_MODEL = "nvidia/nemotron-nano-12b-v2-vl:free"

# Initialize Client
vision_client = AsyncOpenAI(
    api_key=VISION_API_KEY,
    base_url=VISION_BASE_URL,
    default_headers={
        "HTTP-Referer": "http://localhost:5173",
        "X-Title": "PeasyApp",
    }
)

# Single-Turn Visual Chain-of-Thought Prompt
# Consolidates Describe + Identify into one API call.
VISION_PROMPT = """You are a PC hardware identification expert.
Identify the model of the computer component in the image.

## REASONING:
1. Identify the TYPE (GPU, RAM, etc).
2. Scan for ALPHANUMERIC TEXT/LABELS (e.g. 'RTX 3080', 'GV-N3080GAMING').
3. **DO NOT** confuse brand logos (like the ROG Eye or MSI Dragon) with OCR.
4. If you read model name text from a sticker/label/PCB, set is_ocr_confirmed: true and confidence: 0.99.
5. If you only see a LOGO or guess by shape, set is_ocr_confirmed: false.

## OUTPUT:
Return ONLY a JSON object in a ```json code block. No conversation.

{
  "component_type": "GPU/RAM/SSD/etc.",
  "brand": "e.g. ASUS, MSI",
  "sub_brand": "e.g. ROG Strix",
  "model": "Full Model Name",
  "confidence": 0.0 to 1.0,
  "is_ocr_confirmed": true/false, // True ONLY for transcribed alphanumeric text
  "is_uncertain": true/false,
  "possible_models": [],
  "notes": "Brief reasoning",
  "visual_description": "Physical features found"
}"""

def clean_and_extract_json(content: str) -> dict:
    import re
    # 1. Try to find content within ```json ... ``` or ``` ... ``` code blocks
    code_block_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', content, re.DOTALL)
    json_str = code_block_match.group(1) if code_block_match else ""
    
    # 2. If no code block, try a greedy search for any { ... }
    if not json_str:
        json_match = re.search(r'(\{.*\})', content, re.DOTALL)
        if json_match:
            json_str = json_match.group(1)
            
    if not json_str:
        return None
        
    try:
        # Simple cleanup for trailing commas before parsing
        json_str = re.sub(r',\s*([\]}])', r'\1', json_str)
        return json.loads(json_str)
    except Exception as e:
        print(f"JSON Parse Error: {e} | Content: {json_str[:200]}...")
        return None

def resize_image(image_bytes: bytes, max_size=1024) -> bytes:
    img = Image.open(io.BytesIO(image_bytes))
    img.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
    output = io.BytesIO()
    img.save(output, format='JPEG', quality=85)
    return output.getvalue()

def crop_to_bbox(image_bytes: bytes, bbox: list) -> bytes:
    img = Image.open(io.BytesIO(image_bytes))
    x1, y1, x2, y2 = [int(coord) for coord in bbox]
    cropped = img.crop((x1, y1, x2, y2))
    output = io.BytesIO()
    cropped.save(output, format='JPEG', quality=85)
    return output.getvalue()

async def call_serpapi(image_bytes: bytes):
    api_key = os.getenv("SERP_API_KEY")
    if not api_key:
        return {"error": "No SERP_API_KEY found"}
    
    url = "https://serpapi.com/search?engine=google_lens"
    files = {'file': ('image.jpg', image_bytes, 'image/jpeg')}
    params = {'api_key': api_key}

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(url, params=params, files=files, timeout=20.0)
            data = response.json()

        visual_matches = data.get("visual_matches", [])
        if not visual_matches:
            return {"error": "No visual matches"}
        
        top_result = visual_matches[0]
        return {
            "model": top_result.get("title", "Unknown"),
            "confidence": 0.95,
            "notes": f"Verified via Google Lens visual signature. Top match: {top_result.get('title')}",
            "link": top_result.get("link")
        }
    except Exception as e:
        return {"error": str(e)}

async def call_vision_api(image_bytes: bytes, bbox: list = None, quantity: int = 1) -> dict:
    max_retries = 3
    for attempt in range(max_retries):
        try:
            # Image Pre-processing
            if bbox:
                image_bytes_processed = crop_to_bbox(image_bytes, bbox)
            else:
                image_bytes_processed = image_bytes
            image_bytes_processed = resize_image(image_bytes_processed)
            b64_image = base64.b64encode(image_bytes_processed).decode()

            # Prepare Prompt
            prompt = VISION_PROMPT
            if quantity > 1:
                prompt += f"\n\nNOTE: The user has indicated there are {quantity} of this component in the build."

            # Single Turn API Call
            response = await vision_client.chat.completions.create(
                model=VISION_MODEL,
                messages=[{"role": "user", "content": [
                    {"type": "text", "text": prompt},
                    {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64_image}"}}
                ]}],
                max_tokens=800,
                temperature=0.1
            )
            content = response.choices[0].message.content
            
            # Debug log for NVIDIA output
            print(f"--- VLM RAW OUTPUT ({VISION_MODEL}) ---\n{content}\n--- END ---")
            
            # Robust Extraction
            result = clean_and_extract_json(content)
            if result:
                return result
                
            return {"error": "No JSON found in response", "raw_content": content[:500]}

        except Exception as e:
            if attempt < max_retries - 1:
                await asyncio.sleep(1)
                continue
            return {"error": str(e)}

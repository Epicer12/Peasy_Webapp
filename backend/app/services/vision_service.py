import os
import io
import base64
import json
import httpx
import asyncio
from PIL import Image
from openai import AsyncOpenAI
from supabase import create_client

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

# Supabase Initialization (for component lookup)
MAIN_SUPABASE_URL = os.getenv("MAIN_SUPABASE_URL")
MAIN_SUPABASE_KEY = os.getenv("MAIN_SUPABASE_KEY")

supabase_client = None
if MAIN_SUPABASE_URL and MAIN_SUPABASE_KEY:
    supabase_client = create_client(MAIN_SUPABASE_URL, MAIN_SUPABASE_KEY)

# Performance Cache
lookup_cache = {}
lookup_lock = asyncio.Lock()

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
  "short_model_name": "Simplified name for DB search (e.g. 'RTX 3080' or 'i9-12900K')",
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

async def search_supabase_model(component_type: str, search_query: str) -> dict:
    """Broaden search by matching VLM results against Supabase databases with caching and parallel execution"""
    if not supabase_client or not search_query:
        return None
    
    # Cache lookup
    cache_key = f"{component_type}:{search_query.lower()}"
    async with lookup_lock:
        if cache_key in lookup_cache:
            print(f"DEBUG: Cache Hit for {cache_key}")
            return lookup_cache[cache_key]

    # Mapping identified types to Supabase tables and their searchable columns
    table_map = {
        "CPU": {"table": "cpu", "column": "processor_name"},
        "GPU": {"table": "gpu", "column": "component_name"},
        "RAM": {"table": "ram", "column": "component_name"},
        "STORAGE": {"table": "storage_devices", "column": "component_name"},
        "SSD": {"table": "storage_devices", "column": "component_name"},
        "HDD": {"table": "storage_devices", "column": "component_name"},
        "PSU": {"table": "power_supplies", "column": "component_name"},
        "CASE": {"table": "cases", "column": "component_name"},
        "MOTHERBOARD": {"table": "motherboard", "column": "component_name"},
        "COOLER": {"table": "cpu_cooler", "column": "component_name"},
        "FAN": {"table": "cpu_cooler", "column": "component_name"}
    }

    # Normalize component type
    c_type = component_type.upper()
    if c_type not in table_map:
        for key in table_map:
            if key in c_type or c_type in key:
                c_type = key
                break
        else:
            return None

    config = table_map[c_type]
    table_name = config["table"]
    column_name = config["column"]

    async def _execute_query(filter_val: str):
        try:
            # Wrap in asyncio.to_thread if the supabase client is synchronous
            # But here we are just calling it. The execution might stay sync if the driver is sync.
            response = supabase_client.table(table_name).select("*").ilike(column_name, filter_val).limit(1).execute()
            if response.data and len(response.data) > 0:
                match = response.data[0]
                return {
                    "matched_model": match.get(column_name),
                    "db_table": table_name,
                    "db_data": match
                }
        except Exception:
            pass
        return None

    start_time = asyncio.get_event_loop().time()
    result = None

    try:
        # 1. Broad Search (Sequential as it's the most likely to be correct and fast if it hits)
        query_parts = [w for w in search_query.split() if len(w) >= 3]
        if not query_parts:
            return None
            
        search_filter = f"%{'%'.join(query_parts)}%"
        result = await _execute_query(search_filter)

        # 2. Parallel Fallback (Only if broad search fails)
        if not result and len(query_parts) > 1:
            # Prune junk words for fallback
            noise_words = {"the", "and", "with", "model", "brand", "version", "edition", "series"}
            refined_parts = [w for w in query_parts if w.lower() not in noise_words]
            
            # Execute all word searches in parallel
            tasks = [_execute_query(f"%{word}%") for word in refined_parts]
            f_results = await asyncio.gather(*tasks)
            
            # Pick first non-None result
            for r in f_results:
                if r:
                    result = r
                    break
                    
    except Exception as e:
        print(f"Supabase Lookup Error: {e}")

    # Update cache
    if result:
        async with lookup_lock:
            lookup_cache[cache_key] = result
    
    end_time = asyncio.get_event_loop().time()
    print(f"DEBUG: Supabase lookup for '{search_query}' took {end_time - start_time:.3f}s")
    
    return result

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
                # INTEGRATION: Broaden search with Supabase
                model_name = result.get("short_model_name") or result.get("model")
                comp_type = result.get("component_type")
                
                if model_name and comp_type:
                    db_match = await search_supabase_model(comp_type, model_name)
                    if db_match:
                        result["model"] = db_match["matched_model"]
                        result["notes"] = f"{result.get('notes', '')}\n(Verified against database table: {db_match['db_table']})".strip()
                        result["is_db_verified"] = True
                        # result["db_details"] = db_match["db_data"] # Optional: heavy data
                    else:
                        result["is_db_verified"] = False
                        # BRAND-BASED FALLBACK: If model is unknown/generic but brand is known
                        is_generic = any(word in model_name.lower() for word in ["unknown", "generic", "component", "model"])
                        brand = result.get("brand")
                        if (is_generic or not model_name) and brand and brand.lower() != "unknown":
                            fallback_name = f"{brand} {comp_type}"
                            result["model"] = fallback_name
                            result["notes"] = f"{result.get('notes', '')}\n(Note: Specific model not identified; showing descriptive brand name)".strip()

                return result
                
            return {"error": "No JSON found in response", "raw_content": content[:500]}

        except Exception as e:
            if attempt < max_retries - 1:
                await asyncio.sleep(1)
                continue
            return {"error": str(e)}

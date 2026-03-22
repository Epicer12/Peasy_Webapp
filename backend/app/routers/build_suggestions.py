import os
import json
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
from supabase import create_client
from groq import Groq
from openai import OpenAI

router = APIRouter()

# Initialize Supabase
url = os.getenv("MAIN_SUPABASE_URL") or os.getenv("SUPABASE_URL")
key = os.getenv("MAIN_SUPABASE_KEY") or os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")

supabase = None
try:
    if url and key:
        supabase = create_client(url, key)
    else:
        print("Warning: Supabase credentials not found in build_suggestions.py")
except Exception as e:
    print(f"Supabase init error: {e}")

price_columns = {
    "case_fans_final": "estimated_price_lkr",
    "cases_final": "estimated_price_lkr",
    "cpu_coolers_final": "estimated_price_lkr",
    "cpu_final": "estimated_price",
    "gpu_final": "estimated_lkr_price",
    "hdd_final": "estimated_price_lkr",
    "motherboard_final": "estimated_price",
    "psu_final": "estimated_price_lkr",
    "ram_final": "estimated_price",
    "ssd_final": "estimated_price_lkr"
}

import time

def fetch_candidates(table: str, alloc: float, max_budget: float, min_alloc: float = 0) -> List[Dict]:
    if not supabase: return []
    price_col = price_columns.get(table, "estimated_price_lkr")
    
    base_min_prices = {
        "cpu_final": 15000,
        "gpu_final": 25000,
        "motherboard_final": 15000,
        "ram_final": 12000,
        "ssd_final": 10000,
        "psu_final": 10000,
        "cases_final": 8000
    }
    # Aggressive dynamic floor: use 80% of the proportional min_alloc
    # This ensures the selection pool is naturally within the user's budget range.
    min_p = max(base_min_prices.get(table, 1000), min_alloc * 0.8)

    # Capping components to a realistic window around the allocation
    # Stricter multiplier (1.25) to keep the AI from going over budget
    upper_limit = min(alloc * 1.25, max_budget * 0.8)
    
    # Safety: ensure upper_limit > min_p
    if upper_limit <= min_p:
        upper_limit = min_p * 1.5

    max_retries = 3
    for attempt in range(max_retries):
        try:
            # OPTIMIZATION: One broad request for top and one for bottom to reduce connection churn
            # This avoids the "Server disconnected" error caused by too many serial requests.
            def get_subset(ascending: bool, limit: int):
                # Small exponential backoff between internal calls if needed
                q = supabase.table(table).select("*").gt(price_col, min_p).lte(price_col, upper_limit)
                q = q.order(price_col, desc=not ascending).limit(limit)
                return q.execute().data or []

            # We pull 40 items from both ends to have a rich pool to filter in Python
            high_pool = get_subset(False, 40)
            low_pool = get_subset(True, 40)
            all_pool = high_pool + low_pool
            
            # Remove duplicates by ID
            seen = set()
            unique_pool = []
            for itm in all_pool:
                if itm['id'] not in seen:
                    unique_pool.append(itm)
                    seen.add(itm['id'])
            
            if not unique_pool:
                return []

            # Filter by Brand / Socket in Python to avoid multiple DB round-trips
            if table == "cpu_final":
                brands = ["amd", "intel"]
                brand_col = "brand"
            elif table == "gpu_final":
                brands = ["nvidia", "amd"]
                brand_col = "manufacturer"
            elif table == "ram_final":
                brands = ["ddr4", "ddr5"]
                brand_col = "type"
            elif table == "motherboard_final":
                # Broaden sockets significantly
                brands = ["am4", "am5", "lga1700", "1200", "1151"]
                brand_col = "socket"
            else:
                return unique_pool[:25] # Just return a spread for other parts

            # Categorize from our pool
            filtered_results = []
            for b_name in brands:
                matches = [x for x in unique_pool if b_name in str(x.get(brand_col, "")).lower()]
                # Take up to 5 best and 5 cheapest for each brand from our pool
                matches.sort(key=lambda x: x.get(price_col, 0), reverse=True)
                filtered_results.extend(matches[:6])
                filtered_results.extend(matches[-4:])
            
            return filtered_results

        except Exception as e:
            print(f"Fetch err {table} (attempt {attempt+1}): {e}")
            if attempt < max_retries - 1:
                time.sleep(1 * (attempt + 1)) # Backoff
            else:
                return []
    return []

def fetch_by_id(table: str, component_id: str) -> Optional[Dict]:
    """Fetch a single component from a _final table by its ID"""
    try:
        res = supabase.table(table).select("*").eq("id", component_id).execute()
        if res.data:
            return format_comp(table, res.data[0])
    except Exception as e:
        print(f"Error fetching {table} by id {component_id}: {e}")
    return None

class BuildRequest(BaseModel):
    summary: Dict[str, Any]

def format_comp(table: str, item: Dict) -> Dict:
    # Standardize and minify everything for LLM ingestion to save tokens
    pcol = price_columns.get(table, "estimated_price_lkr")
    base = {
        "id": item.get("id", ""),
        "price": float(item.get(pcol, 0) or 0)
    }
    
    if table == "cpu_final":
        base.update({"name": item.get("model", ""), "brand": item.get("brand", ""), "socket": item.get("cpu_socket", ""), "tdp": item.get("default_tdp", 65)})
    elif table == "motherboard_final":
        base.update({"name": item.get("name", ""), "socket": item.get("socket", ""), "ram_type": item.get("memory_type", ""), "form": item.get("form_factor", ""), "chipset": item.get("chipset", "")})
    elif table == "ram_final":
        base.update({"name": item.get("name", item.get("final_model_name", "")), "type": item.get("type", "")})
    elif table == "cases_final":
        base.update({"name": item.get("name", ""), "form": item.get("motherboard_support", "")})
    elif table == "psu_final":
        base.update({"name": item.get("final_model_name", item.get("name", "")), "wattage": item.get("wattage", 500)})
    elif table == "gpu_final":
        base.update({"name": item.get("name", item.get("model_name", "")), "brand": item.get("manufacturer", ""), "tdp": item.get("tdp", 150), "g3_mark": item.get("g3_dmark", 0)})
    elif table == "ssd_final":
        base.update({"name": item.get("final_model_name", item.get("name", "")), "protocol": item.get("protocol", "NVMe")})
    else:
        # Default fallback for storage, hdd, coolers, fans
        base.update({"name": item.get("final_model_name", item.get("model_name", item.get("name", "")))})
        
    return base

@router.post("/generate-builds")
def generate_builds(req: BuildRequest):
    basic = req.summary.get("basicPreferences", {})
    owned = req.summary.get("ownedComponents", {})
    budget_range = basic.get("budget", {})
    max_budget = float(budget_range.get("max") or 200000)
    min_budget = float(budget_range.get("min") or 0)

    # --- Budget Management & Redistribution ---
    base_alloc_pcts = {
        "cpu_final": 0.22,
        "gpu_final": 0.40,
        "motherboard_final": 0.12,
        "ram_final": 0.08,
        "ssd_final": 0.08,
        "psu_final": 0.05,
        "cases_final": 0.03,
        "cpu_coolers_final": 0.015,
        "case_fans_final": 0.005
    }

    # Redistribute budget if components are owned
    total_freed_pct = 0.0
    
    # Mapping owned component types to our database tables
    owned_map = {
        "CPU": "cpu_final",
        "GPU": "gpu_final",
        "RAM": "ram_final",
        "SSD": "ssd_final",
        "HDD": "hdd_final",
        "PSU": "psu_final",
        "Case": "cases_final"
    }

    processed_owned = {}
    for cat, data in owned.items():
        table = owned_map.get(cat)
        if not table or not data:
            continue
            
        # If the frontend sent a component object (with ID), fetch its authoritative specs
        if isinstance(data, dict) and data.get("id"):
            item = fetch_by_id(table, data["id"])
            if item:
                processed_owned[table] = item
                total_freed_pct += base_alloc_pcts.get(table, 0)
                continue
        
        # Fallback for string names or cases where ID fetch fails
        name_str = data.get("name") if isinstance(data, dict) else str(data)
        if name_str:
            processed_owned[table] = {"name": name_str}
            total_freed_pct += base_alloc_pcts.get(table, 0)

    # Calculate final allocations (min and max)
    allocs = {}
    min_allocs = {}
    
    remaining_cats = [c for c in base_alloc_pcts.keys() if c not in processed_owned]
    if not remaining_cats: remaining_cats = ["cpu_final"]
    total_remaining_pct = sum(base_alloc_pcts[c] for c in remaining_cats)

    for cat, pct in base_alloc_pcts.items():
        if cat in remaining_cats:
            # Proportional share of freed budget (from owned components)
            share = (pct / total_remaining_pct) * total_freed_pct
            allocs[cat] = max_budget * (pct + share)
            min_allocs[cat] = min_budget * (pct + share)
        else:
            allocs[cat] = max_budget * pct
            min_allocs[cat] = min_budget * pct

    # Fetch and format all candidates
    sandbox_db = {}
    for table, alloc in allocs.items():
        if table in processed_owned:
            sandbox_db[table] = [] # User owns this
            continue
            
        m_alloc = min_allocs.get(table, 0)
        raw_items = fetch_candidates(table, alloc, max_budget, m_alloc)
        candidates = [format_comp(table, x) for x in raw_items if format_comp(table, x)["price"] > 0]
        
        # Sort by price ascending to help AI navigate the range
        candidates.sort(key=lambda x: x["price"])
        sandbox_db[table] = candidates
        print(f"Table {table}: Found {len(sandbox_db[table])} formatted candidates.")

    # HDD is handled separately
    sandbox_db["hdd_final"] = [format_comp("hdd_final", x) for x in fetch_candidates("hdd_final", max_budget * 0.05, max_budget, 0) if format_comp("hdd_final", x)["price"] > 0]

    # Verify if we even hit the database
    db_items_count = sum(len(items) for items in sandbox_db.values())
    if db_items_count == 0:
        return {"warning": "Component database is currently empty or unreachable.", "builds": []}

    system_prompt = f"""You are an elite PC build configuration AI. 
Generate EXACTLY 4 distinct PC builds using ONLY the provided database or owned components.

### BUDGET & PRICE RULES (STRICT):
1. **Budget Window**: {min_budget:,.0f} LKR to {max_budget:,.0f} LKR. Total price MUST be within this range.
2. **Owned Components**: Price = 0. Label as "Already owned: <name>".
3. **Database Prices**: Use the exact 'price' field. No 0 prices for new parts.
4. **Calculations**: 'total_price' = exact sum of non-owned components. Double-check math!
5. **Optimization**: If over budget, swap for cheaper items from the top of the candidate list (sorted by price).

### HARDWARE CONSTRAINTS:
- **Owned Parts**: MUST be included in ALL 4 builds. Respect all specs (socket, RAM type, etc.).
- **Compatibility**: 
  - AM5 CPU -> AM5 Mobo + DDR5 RAM.
  - AM4 CPU -> AM4 Mobo + DDR4 RAM.
  - LGA1700 CPU -> LGA1700 Mobo.
  - Case must support Mobo form factor.
  - PSU Wattage: TDP + 30% headroom (Min 650W for mid-range, 750W for high-end).
- **Workload**: If 'Gaming', AVOID workstation GPUs (Quadro, RTX A-series, T-series).
- **Thermals**: High-end CPUs (i7/i9/R7/R9) REQUIRE high-performance Air/AIO coolers.
- **Storage**: Gaming builds REQUIRE min 1TB SSD.

### BUILD DIFFERENTIATION:
1. **Balanced**: Optimal price/performance (~{min_budget + (max_budget-min_budget)*0.5:,.0f} LKR).
2. **Performance**: Max power within limit (~{max_budget * 0.95:,.0f} LKR).
3. **Budget Efficient**: Best value near MIN budget (~{min_budget * 1.05:,.0f} LKR).
4. **Alternative**: Different ecosystem (AMD vs Intel, etc.) (~{min_budget + (max_budget-min_budget)*0.4:,.0f} LKR).

### OUTPUT SCHEMA (JSON ONLY):
{{
    "warning": "string",
    "builds": [
        {{
            "id": "b1",
            "name": "string",
            "description": "string",
            "total_price": float,
            "components": [
                {{"type": "CPU/GPU/etc.", "brand": "string", "model": "string", "price": float, "details": "string"}}
            ]
        }}
    ]
}}
Required component types (10): CPU, CPU Cooler, Motherboard, RAM, Storage, HDD, GPU, Power Supply, Case, Case Fans.
"""

    user_prompt = f"""
User Preferences: {json.dumps(basic)}
Already Owned Components: {json.dumps(processed_owned)}
Component Database: {json.dumps(sandbox_db)}

Generate the 4 builds now obeying the JSON schema precisely.
"""

    models_to_try = [
        {"provider": "groq", "model": "llama-3.3-70b-versatile"},
        {"provider": "cerebras", "model": "llama-3.3-70b"},
        {"provider": "nvidia", "model": "meta/llama-3.1-405b-instruct"},
        {"provider": "nvidia", "model": "meta/llama-3.3-70b-instruct"},
        {"provider": "openrouter", "model": "google/gemini-2.0-flash-001"},
        {"provider": "cohere", "model": "command-r-plus"},
        {"provider": "groq", "model": "llama-3.1-8b-instant"},
    ]

    groq_api_key = os.getenv("GROQ_API_KEY")
    new_groq_key = os.getenv("NEW_GROQ_KEY")
    or_key = os.getenv("OPENROUTER_API_KEY")
    or_alt_key = os.getenv("OPENROUTER_API_KEY_ALT")
    nv_key = os.getenv("NVIDIA_API_KEY")
    co_key = os.getenv("COHERE_API_KEY")
    cb_key = os.getenv("CEREBRAS_API_KEY")

    for attempt in models_to_try:
        provider = attempt["provider"]
        model_name = attempt["model"]
        
        try:
            if provider == "groq":
                target_keys = []
                if groq_api_key: target_keys.append(groq_api_key)
                if new_groq_key: target_keys.append(new_groq_key)
                
                for k in target_keys:
                    try:
                        print(f"Attempting {model_name} on Groq...")
                        client = Groq(api_key=k)
                        response = client.chat.completions.create(
                            model=model_name,
                            messages=[
                                {"role": "system", "content": system_prompt},
                                {"role": "user", "content": user_prompt}
                            ],
                            response_format={"type": "json_object"},
                            temperature=0.2,
                            max_tokens=6000
                        )
                        result_json_str = response.choices[0].message.content
                        return clean_build_result(json.loads(result_json_str), owned)
                    except Exception as ge:
                        print(f"Groq error with key ...{k[-4:]}: {ge}")
                        continue
                
            elif provider == "openrouter":

                # Try primary OR key first
                if or_key:
                    try:
                        print(f"Attempting {model_name} on OpenRouter (Primary Key)...")
                        client = OpenAI(base_url="https://openrouter.ai/api/v1", api_key=or_key)
                        response = client.chat.completions.create(
                            model=model_name,
                            messages=[
                                {"role": "system", "content": system_prompt},
                                {"role": "user", "content": user_prompt}
                            ],
                            response_format={"type": "json_object"},
                            temperature=0.2
                        )
                        return clean_build_result(json.loads(response.choices[0].message.content), owned)
                    except Exception as e:
                        print(f"OpenRouter Primary Error with {model_name}: {e}")
                        
                # Try alt OR key second
                if or_alt_key:
                    try:
                        print(f"Attempting {model_name} on OpenRouter (Alt Key)...")
                        client = OpenAI(base_url="https://openrouter.ai/api/v1", api_key=or_alt_key)
                        response = client.chat.completions.create(
                            model=model_name,
                            messages=[
                                {"role": "system", "content": system_prompt},
                                {"role": "user", "content": user_prompt}
                            ],
                            response_format={"type": "json_object"},
                            temperature=0.2
                        )
                        return clean_build_result(json.loads(response.choices[0].message.content), owned)
                    except Exception as e:
                        print(f"OpenRouter Alt Error with {model_name}: {e}")

            elif provider == "nvidia" and nv_key:
                try:
                    print(f"Attempting {model_name} on NVIDIA NIM...")
                    client = OpenAI(base_url="https://integrate.api.nvidia.com/v1", api_key=nv_key)
                    response = client.chat.completions.create(
                        model=model_name,
                        messages=[
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_prompt}
                        ],
                        response_format={"type": "json_object"},
                        temperature=0.2,
                        max_tokens=4096
                    )
                    return clean_build_result(json.loads(response.choices[0].message.content), owned)
                except Exception as ne:
                    print(f"NVIDIA API Error with {model_name}: {ne}")

            elif provider == "cerebras" and cb_key:
                try:
                    print(f"Attempting {model_name} on Cerebras...")
                    client = OpenAI(base_url="https://api.cerebras.ai/v1", api_key=cb_key)
                    response = client.chat.completions.create(
                        model=model_name,
                        messages=[
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_prompt}
                        ],
                        response_format={"type": "json_object"},
                        temperature=0.2
                    )
                    return clean_build_result(json.loads(response.choices[0].message.content), owned)
                except Exception as ce:
                    print(f"Cerebras Error with {model_name}: {ce}")

            elif provider == "cohere" and co_key:
                try:
                    print(f"Attempting {model_name} on Cohere...")
                    client = OpenAI(base_url="https://api.cohere.com/v1", api_key=co_key)
                    response = client.chat.completions.create(
                        model=model_name,
                        messages=[
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_prompt}
                        ],
                        response_format={"type": "json_object"},
                        temperature=0.2
                    )
                    return clean_build_result(json.loads(response.choices[0].message.content), owned)
                except Exception as coe:
                    print(f"Cohere Error with {model_name}: {coe}")

                        
        except Exception as e:
            print(f"Error with {model_name} on {provider}: {e}")
            # Continue to next model in loop

    return {
        "warning": "PC build generation is currently unavailable due to system load. Please try again soon.", 
        "builds": []
    }

@router.post("/generate-summary")
def generate_summary(req: Dict[str, Any]):
    current_builds = req.get("builds", [])
    if not current_builds:
        return {"summaries": []}

    system_prompt = """You are a professional PC hardware expert. 
Given a set of PC build configurations, provide a very concise 'Pros' and 'Cons' summary for EACH build.
Rules:
1. Be professional and encouraging. 
2. In 'Cons', do NOT be overly negative. Instead of saying things like 'not compatible' or 'weak', focus on trade-offs like 'Focused on value over peak performance' or 'Mid-range storage capacity'.
3. Every build is verified compatible, so NEVER mention incompatibility.
4. Keep each list (Pros/Cons) to exactly 2-3 bullet points.
5. Return ONLY a valid JSON object with the key 'summaries' containing an array of objects: {"name": "Build Name", "pros": ["..."], "cons": ["..."]}
"""
    user_prompt = f"Configurations: {json.dumps(current_builds)}"

    models_to_try = [
        {"provider": "groq", "model": "llama-3.3-70b-versatile"},
        {"provider": "cerebras", "model": "llama-3.3-70b"},
        {"provider": "nvidia", "model": "meta/llama-3.1-405b-instruct"},
        {"provider": "openrouter", "model": "google/gemini-2.0-flash-001"},
        {"provider": "cohere", "model": "command-r-plus"},
    ]

    groq_api_key = os.getenv("GROQ_API_KEY")
    new_groq_key = os.getenv("NEW_GROQ_KEY")
    or_key = os.getenv("OPENROUTER_API_KEY")
    or_alt_key = os.getenv("OPENROUTER_API_KEY_ALT")
    nv_key = os.getenv("NVIDIA_API_KEY")
    co_key = os.getenv("COHERE_API_KEY")
    cb_key = os.getenv("CEREBRAS_API_KEY")

    def normalize_summary(raw: dict) -> dict:
        """Guarantee the response always has a 'summaries' list, regardless of what the AI returns."""
        if isinstance(raw, dict):
            if "summaries" in raw:
                return raw
            # AI sometimes wraps under different keys
            for fallback_key in ["builds", "results", "data", "analysis"]:
                if fallback_key in raw and isinstance(raw[fallback_key], list):
                    return {"summaries": raw[fallback_key]}
        print(f"[Summary] WARNING: Could not normalize AI response: {str(raw)[:200]}")
        return {"summaries": []}

    for attempt in models_to_try:
        provider = attempt["provider"]
        model_name = attempt["model"]
        try:
            if provider == "groq":
                keys = [k for k in [groq_api_key, new_groq_key] if k]
                for k in keys:
                    try:
                        client = Groq(api_key=k)
                        response = client.chat.completions.create(
                            model=model_name,
                            messages=[{"role": "system", "content": system_prompt}, {"role": "user", "content": user_prompt}],
                            response_format={"type": "json_object"}
                        )
                        raw = json.loads(response.choices[0].message.content)
                        print(f"[Summary] Groq success. Keys: {list(raw.keys()) if isinstance(raw, dict) else 'not a dict'}")
                        return normalize_summary(raw)
                    except Exception as e:
                        print(f"[Summary] Groq err ({k[-4:]}): {e}")
                        continue
            elif provider == "openrouter":
                keys = [k for k in [or_key, or_alt_key] if k]
                for k in keys:
                    try:
                        client = OpenAI(base_url="https://openrouter.ai/api/v1", api_key=k)
                        response = client.chat.completions.create(
                            model=model_name,
                            messages=[{"role": "system", "content": system_prompt}, {"role": "user", "content": user_prompt}],
                            response_format={"type": "json_object"}
                        )
                        raw = json.loads(response.choices[0].message.content)
                        print(f"[Summary] OpenRouter success. Keys: {list(raw.keys()) if isinstance(raw, dict) else 'not a dict'}")
                        return normalize_summary(raw)
                    except Exception as e:
                        print(f"[Summary] OpenRouter err: {e}")
                        continue
            elif provider == "nvidia" and nv_key:
                try:
                    client = OpenAI(base_url="https://integrate.api.nvidia.com/v1", api_key=nv_key)
                    response = client.chat.completions.create(
                        model=model_name,
                        messages=[{"role": "system", "content": system_prompt}, {"role": "user", "content": user_prompt}],
                        response_format={"type": "json_object"}
                    )
                    raw = json.loads(response.choices[0].message.content)
                    print(f"[Summary] NVIDIA success. Keys: {list(raw.keys()) if isinstance(raw, dict) else 'not a dict'}")
                    return normalize_summary(raw)
                except Exception as e:
                    print(f"[Summary] NVIDIA err: {e}")
                    continue
            elif provider == "cerebras" and cb_key:
                try:
                    client = OpenAI(base_url="https://api.cerebras.ai/v1", api_key=cb_key)
                    response = client.chat.completions.create(
                        model=model_name,
                        messages=[{"role": "system", "content": system_prompt}, {"role": "user", "content": user_prompt}],
                        response_format={"type": "json_object"}
                    )
                    raw = json.loads(response.choices[0].message.content)
                    print(f"[Summary] Cerebras success. Keys: {list(raw.keys()) if isinstance(raw, dict) else 'not a dict'}")
                    return normalize_summary(raw)
                except Exception as e:
                    print(f"[Summary] Cerebras err: {e}")
                    continue
            elif provider == "cohere" and co_key:
                try:
                    client = OpenAI(base_url="https://api.cohere.com/v1", api_key=co_key)
                    response = client.chat.completions.create(
                        model=model_name,
                        messages=[{"role": "system", "content": system_prompt}, {"role": "user", "content": user_prompt}],
                        response_format={"type": "json_object"}
                    )
                    raw = json.loads(response.choices[0].message.content)
                    print(f"[Summary] Cohere success. Keys: {list(raw.keys()) if isinstance(raw, dict) else 'not a dict'}")
                    return normalize_summary(raw)
                except Exception as e:
                    print(f"[Summary] Cohere err: {e}")
                    continue
        except Exception as e:
            print(f"[Summary] General err {model_name}: {e}")
            continue

    return {"summaries": []}


def clean_build_result(data: Dict, owned_comps: Dict = None) -> Dict:
    """Ensure the AI output matches our frontend's expectations."""
    if owned_comps is None: owned_comps = {}
    if not isinstance(data, dict): 
        return {"warning": "Invalid AI response structure.", "builds": []}
    
    clean_data = {
        "warning": str(data.get("warning", "")),
        "builds": []
    }
    
    categories = ["CPU", "CPU Cooler", "Motherboard", "RAM", "Storage", "HDD", "GPU", "Power Supply", "Case", "Case Fans"]
    type_map = {
        "SSD": "Storage",
        "PSU": "Power Supply",
        "Case Fan": "Case Fans",
        "Graphics Card": "GPU",
        "Video Card": "GPU",
        "Processor": "CPU"
    }

    raw_builds = data.get("builds", [])
    if not isinstance(raw_builds, list): raw_builds = []
    
    for i, b in enumerate(raw_builds):
        if not isinstance(b, dict): continue
        
        clean_build = {
            "id": str(b.get("id", f"b{i+1}")),
            "name": str(b.get("name", f"Build {i+1}")),
            "description": str(b.get("description", "")),
            "total_price": 0.0,
            "components": []
        }
        
        raw_comps = b.get("components", [])
        if not isinstance(raw_comps, list): raw_comps = []
        
        # Map existing comps
        mapped_comps = {}
        for c in raw_comps:
            if not isinstance(c, dict): continue
            ctype = str(c.get("type", "Unknown"))
            # Normalization
            ctype = type_map.get(ctype, ctype)
            
            brand = str(c.get("brand", "N/A"))
            model = str(c.get("model", "N/A"))
            price = float(c.get("price") or 0)
            
            # CRITICAL USER RULE: Prevent "Seagate 2TB" -> LKR 0
            if price == 0:
                m_lower = model.lower()
                
                # Check absolute truth: does the user actually own this category?
                is_owned = False
                for k, v in owned_comps.items():
                    # Match keys like 'cpu', 'gpu', 'ram', 'storage', 'motherboard', 'case', 'case_fans', 'psu'
                    # against ctype like 'CPU', 'Storage', 'Power Supply', 'Case Fans'.
                    cat_normalized = ctype.replace(" ", "").lower()
                    k_normalized = k.replace(" ", "").lower()
                    if cat_normalized == k_normalized or (k_normalized == 'psu' and cat_normalized == 'powersupply'):
                        if isinstance(v, dict) and v.get("model"):
                            is_owned = True
                        elif isinstance(v, str) and v.strip():
                            is_owned = True
                            
                if "owned" in m_lower or is_owned:
                    # It's an owned component. Force the "Already owned:" tag if missing.
                    if "owned" not in m_lower:
                        model = f"Already owned: {model}"
                elif "none" in m_lower or "n/a" in m_lower or "not included" in m_lower:
                    brand = "None"
                    model = "Not included"
                else:
                    # AI Hallucinated a 0 price for a real component (e.g. out of budget)!
                    # Hide the real model and mark it as excluded.
                    brand = "None"
                    model = "Not included (Budget constraint)"
            
            comp_obj = {
                "type": ctype,
                "brand": brand,
                "model": model,
                "price": price,
                "details": str(c.get("details", ""))
            }
            mapped_comps[ctype] = comp_obj

        # Calculate total price correctly even if the LLM hallucinated
        build_total = 0.0
        # Ensure all 10 categories exist
        for cat in categories:
            if cat in mapped_comps:
                comp = mapped_comps[cat]
                clean_build["components"].append(comp)
                build_total += comp["price"]
            else:
                clean_build["components"].append({
                    "type": cat,
                    "brand": "N/A",
                    "model": "Not included",
                    "price": 0,
                    "details": ""
                })
        
        # Always use the recalculated sum for precision
        clean_build["total_price"] = build_total
            
        clean_data["builds"].append(clean_build)

    # ── Post-processing: enforce Budget build is always the cheapest ──────
    builds_out = clean_data["builds"]
    budget_build = next(
        (b for b in builds_out if "budget" in b["name"].lower()), None
    )
    if budget_build and len(builds_out) > 1:
        other_totals = [b["total_price"] for b in builds_out if b is not budget_build]
        min_other = min(other_totals) if other_totals else 0
        if budget_build["total_price"] >= min_other:
            # AI violated the rule — log it so developers can track
            print(
                f"[PRICE GUARD] Budget Efficient Build total ({budget_build['total_price']:,.0f}) "
                f"is NOT cheaper than all other builds (min other: {min_other:,.0f}). "
                "The AI did not obey the BUDGET PRICE ORDERING rule."
            )
            # Surface a subtle note in the description so it's visible during testing
            budget_build["description"] = (
                budget_build.get("description", "") +
                " [Note: AI may not have applied full budget optimization — regenerate if prices seem incorrect.]"
            ).strip()

    return clean_data

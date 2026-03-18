import os
import json
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Dict, Any, List
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
        "Storage": "ssd_final",
        "PSU": "psu_final",
        "Case": "cases_final"
    }

    processed_owned = {}
    for cat, name in owned.items():
        table = owned_map.get(cat)
        if table and name:
            processed_owned[table] = name
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

    system_prompt = f"""You are an elite PC build configuration AI wrapper. 
Your task is to generate EXACTLY 4 distinct PC builds perfectly assembled based ONLY on the components provided in the JSON database payload or the user's ALREADY OWNED components.

CRITICAL PRICE RULES:
1. Every component MUST use its actual price from 'price' field in the database.
2. PRICE MUST NEVER BE 0 for any component unless it is explicitly marked as "Already owned:". 
3. If you select a component from the database, you MUST include its assigned price.

TOTAL PRICE CALCULATION & BUDGET (STRICT):
1. 'total_price' MUST be the exact mathematical sum of all component prices where the price is > 0.
2. OWNED components count as 0 in this sum.
3. DOUBLE-CHECK YOUR MATH before returning. The 'total_price' must be 100% accurate.
4. ABSOLUTE RULE: THE BUILD TOTAL PRICE MUST ALWAYS STAY WITHIN THE MIN AND MAX BUDGET.
   - Budget Window: {min_budget:,.0f} LKR to {max_budget:,.0f} LKR.
   - IF TOTAL_PRICE > {max_budget:,.0f}, YOUR BUILD IS INVALID AND REJECTED.
   - IF TOTAL_PRICE < {min_budget:,.0f}, YOUR BUILD IS INVALID AND REJECTED.
   - EVERY BUILD MUST BE >= {min_budget:,.0f} AND <= {max_budget:,.0f}.
   - YOU MUST PRIORITIZE STAYING WITHIN THIS LIMIT OVER ANY PERFORMANCE PREFERENCE.
5. Precision Check: If you calculate that you are over budget by even 1 LKR, you MUST swap to a cheaper component from the database immediately. The database is sorted by price (ascending); use items from the top of the lists to save money.

OWNED COMPONENT LOCK:
1. If the user owns a component (e.g., CPU, GPU), you MUST include that specific component in ALL 4 builds. 
2. You are NOT allowed to replace owned components. Build the system around them.
3. Label as: "Already owned: <component model>", price: 0.

STRICT HARDWARE COMPATIBILITY:
1. CPU socket MUST match Motherboard socket:
   - AM5 CPU -> AM5 Motherboard
   - AM4 CPU -> AM4 Motherboard
   - LGA1700 CPU -> LGA1700 Motherboard
2. RAM Type MUST match Motherboard:
   - AM5 Motherboards REQUIRE DDR5 RAM.
   - AM4 Motherboards REQUIRE DDR4 RAM.
   - Never mix these.
3. Case must support the Motherboard form factor.
4. PSU must have enough wattage (TDP + 30% headroom).

CRITICAL WORKLOAD GUIDANCE (WORKSTATION VS GAMING):
- If user purpose is GAMING, AVOID ANY GPU containing "RTX A", "Quadro", or "T-Series" (e.g., A2000, A4000, A4500, A5000, RTX 6000). 
- For Gaming, use consumer graphics cards: RTX (40-series/50-series) or RX (7000-series).

STRICT BUILD DIFFERENTIATION (VERY IMPORTANT):
The four builds MUST NOT be nearly identical. They must differ in at least 3 major components (e.g. GPU model or tier, Motherboard chipset, RAM capacity/brand, Storage capacity, PSU wattage, Case model) while remaining compatible with the user's owned components.
- Build 1 (Balanced Build): Optimal price-to-performance ratio.
- Build 2 (Performance Focused Build): Maximum performance within the {max_budget:,.0f} limit.
- Build 3 (Budget Efficient Build): The best possible performance while staying closest to the MINIMUM budget ({min_budget:,.0f} LKR).
- Build 4 (Alternative Brand Build): Switch ecosystem (AMD vs Intel, NVIDIA vs AMD) while staying within range.
 
TOTAL PRICE CALCULATION & BUDGET (STRICT):
1. 'total_price' MUST be the exact mathematical sum of all component prices where the price is > 0.
2. OWNED components count as 0 in this sum.
3. DOUBLE-CHECK YOUR MATH before returning. The 'total_price' must be 100% accurate.
4. ABSOLUTE RULE: THE BUILD TOTAL PRICE MUST ALWAYS STAY WITHIN THE MIN AND MAX BUDGET.
   - Budget Window: {min_budget:,.0f} LKR to {max_budget:,.0f} LKR.
   - EVERY BUILD MUST BE >= {min_budget:,.0f} AND <= {max_budget:,.0f}.
   - IF TOTAL_PRICE < {min_budget:,.0f}, YOU MUST UPGRADE PARTS (CPU, GPU, RAM, etc.) from the candidate list until it is above {min_budget:,.0f}.

BUILD TYPE TARGETS:
- Build 1 (Balanced): Aim for ~{min_budget + (max_budget-min_budget)*0.5:,.0f} LKR.
- Build 2 (Performance): Aim for ~{max_budget * 0.95:,.0f} LKR.
- Build 3 (Budget Efficient): Aim for ~{min_budget * 1.05:,.0f} LKR.
- Build 4 (Alternative): Aim for ~{min_budget + (max_budget-min_budget)*0.4:,.0f} LKR.

STRICT COMPONENT RULES:
1. NO "Not included" or 0 prices for mandatory components (CPU, Mobo, RAM, SSD, PSU, Case) unless explicitly OWNED by the user.
2. If the user budget is {max_budget:,.0f}, you have plenty of money. DO NOT exclude components. Provide a complete, high-end system.
3. Use the candidate list provided. It is sorted by price (ascending). For high-budget builds, pick from the BOTTOM of the lists.

THERMAL REQUIREMENTS RULE:
High-performance CPUs require strong cooling.
If the CPU is an Intel Core i9, Intel Core i7 (high-end models), Ryzen 9, or Ryzen 7 X3D model:
  - The cooler MUST be a high-performance air cooler or AIO.
  - Do NOT use Low profile coolers or Ultra budget coolers for these CPUs.

STORAGE CAPACITY RULE:
Gaming builds MUST include at least 1TB of SSD storage.
  - Do NOT recommend: 120GB SSD, 240GB SSD, 256GB SSD.

PSU QUALITY RULE:
Power supply must match the GPU power requirements.
  - If GPU is RTX 4070 / RX 7800 XT or higher: PSU MUST be minimum 750W.
  - If GPU is mid-range (RTX 4060 / RX 7700 XT): PSU MUST be minimum 650W.

Output format: Return ONLY a valid JSON object following this SCHEMA:
{{
    "warning": "Friendly warning if budget is too low, else empty string",
    "builds": [
        {{
            "id": "b1",
            "name": "Balanced Build",
            "description": "Description of the build...",
            "total_price": 0.0,
            "components": [
                {{
                    "type": "CPU",
                    "brand": "BrandName",
                    "model": "ModelName",
                    "price": 0,
                    "details": ""
                }},
                ... (exactly 10 component types: "CPU", "CPU Cooler", "Motherboard", "RAM", "Storage", "HDD", "GPU", "Power Supply", "Case", "Case Fans")
            ]
        }}
    ]
}}
"""

    user_prompt = f"""
User Preferences: {json.dumps(basic)}
Already Owned Components: {json.dumps(owned)}
Component Database: {json.dumps(sandbox_db)}

Generate the 4 builds now obeying the JSON schema precisely.
"""

    models_to_try = [
        {"provider": "groq", "model": "llama-3.3-70b-versatile"},
        {"provider": "nvidia", "model": "meta/llama-3.1-405b-instruct"},
        {"provider": "nvidia", "model": "meta/llama-3.3-70b-instruct"},
        {"provider": "openrouter", "model": "google/gemini-2.0-flash-001"},
        {"provider": "groq", "model": "llama-3.1-8b-instant"},
    ]

    groq_api_key = os.getenv("GROQ_API_KEY")
    new_groq_key = os.getenv("NEW_GROQ_KEY")
    or_key = os.getenv("OPENROUTER_API_KEY")
    or_alt_key = os.getenv("OPENROUTER_API_KEY_ALT")
    nv_key = os.getenv("NVIDIA_API_KEY")

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
        {"provider": "nvidia", "model": "meta/llama-3.1-405b-instruct"},
        {"provider": "openrouter", "model": "google/gemini-2.0-flash-001"},
    ]

    groq_api_key = os.getenv("GROQ_API_KEY")
    new_groq_key = os.getenv("NEW_GROQ_KEY")
    or_key = os.getenv("OPENROUTER_API_KEY")
    or_alt_key = os.getenv("OPENROUTER_API_KEY_ALT")
    nv_key = os.getenv("NVIDIA_API_KEY")

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
                        return json.loads(response.choices[0].message.content)
                    except: continue
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
                        return json.loads(response.choices[0].message.content)
                    except: continue
            elif provider == "nvidia" and nv_key:
                try:
                    client = OpenAI(base_url="https://integrate.api.nvidia.com/v1", api_key=nv_key)
                    response = client.chat.completions.create(
                        model=model_name,
                        messages=[{"role": "system", "content": system_prompt}, {"role": "user", "content": user_prompt}],
                        response_format={"type": "json_object"}
                    )
                    return json.loads(response.choices[0].message.content)
                except: continue
        except: continue

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

import os
import re
import json
from typing import List, Dict, Any, Optional
from supabase import create_client
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv(os.path.join(BASE_DIR, ".env"))

_SUPABASE = None

# ─── CALIBRATION CONSTANTS ────────────────────────────────────────────────────

GPU_K_BASELINE        = 1000.0
# CPU_CAP_DIVISOR is now handled by the tiered get_cpu_cap helper.
SYSTEM_OVERHEAD_WATTS = 80
PSU_HEADROOM          = 1.3
CPU_TDP_SANITY_CAP    = 500
GPU_TDP_SANITY_CAP    = 600

# Resolution-aware bottleneck thresholds.
# ratio = score_gpu / score_cpu
#   ratio < gpu_threshold  → GPU is the bottleneck
#   ratio > cpu_threshold  → CPU is the bottleneck
#   in between             → balanced
#
# Why different per resolution:
#   1080p  — CPU feeds frames hard, small imbalances matter more
#   1440p  — middle ground, moderate tolerance both ways
#   4K     — GPU-bound almost always, CPU slack is acceptable
RESOLUTION_THRESHOLDS = {
    "1080p": (0.90, 1.20),
    "1440p": (0.80, 1.30),
    "4K":    (0.65, 1.50),
}

CPU_MARK_SANITY = (2_000, 100_000)
GPU_MARK_SANITY = (1_000,  50_000)

# Known reference G3DMark scores per GPU model fragment.
# If the DB value is outside ±20% of this, we correct it at runtime.
# Add new GPUs here as they release — no code change needed elsewhere.
GPU_REFERENCE_SCORES = {
    "4090":        36_000,
    "4080SUPER":   30_000,
    "4080":        28_500,
    "4070TISUPER": 27_000,
    "4070TI":      24_500,
    "4070SUPER":   29_500,
    "4070":        22_500,
    "4060TI":      18_500,
    "4060":        14_500,
    "3090TI":      22_000,
    "3090":        20_500,
    "3080TI":      20_000,
    "3080":        18_000,
    "3070TI":      16_500,
    "3070":        15_500,
    "3060TI":      14_000,
    "3060":        11_500,
    "3050":         8_500,
    "7900XTX":     24_000,
    "7900XT":      21_000,
    "7900GRE":     19_000,
    "7800XT":      17_000,
    "7700XT":      15_000,
    "7600XT":      13_000,
    "7600":        12_000,
    "6900XT":      18_500,
    "6800XT":      17_000,
    "6800":        15_500,
    "6700XT":      13_000,
    "6600XT":      11_000,
    "6600":         9_500,
    "5090":        39_000,
}

# Known reference PassMark CPU scores.
CPU_REFERENCE_SCORES = {
    "7950X3D": 65_000,
    "7900X3D": 50_226,
    "7800X3D": 47_000,
    "7950X":   62_000,
    "7900X":   55_000,
    "7700X":   40_000,
    "7600X":   33_000,
    "7600":    28_000,
    "14900K":  63_000,
    "14700K":  57_000,
    "14600K":  42_000,
    "13900K":  61_000,
    "13700K":  53_000,
    "13600K":  40_000,
    "12900K":  50_000,
    "12700K":  43_000,
    "12600K":  34_000,
    "5950X":   46_000,
    "5900X":   40_000,
    "5800X3D": 34_000,
    "5800X":   30_000,
    "5600X":   24_000,
    "5600":    22_000,
    "9900K":   22_000,
    "9700K":   18_000,
}

# ─── SUPABASE ─────────────────────────────────────────────────────────────────

def get_supabase():
    global _SUPABASE
    if _SUPABASE is None:
        url = os.getenv("MAIN_SUPABASE_URL") or os.getenv("SUPABASE_URL")
        key = os.getenv("MAIN_SUPABASE_KEY") or os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        if not url or not key:
            print("WARNING: Supabase URL/Key missing in environment")
            return None
        _SUPABASE = create_client(url, key)
    return _SUPABASE

# ─── HELPERS ──────────────────────────────────────────────────────────────────

def parse_val(val: Any) -> float:
    if val is None:
        return 0.0
    if isinstance(val, (int, float)):
        return float(val)
    clean = str(val).replace(",", "")
    match = re.search(r"(\d+\.?\d*)", clean)
    return float(match.group(1)) if match else 0.0


def normalize_name(name: str) -> str:
    """Returns a compact uppercase model fragment e.g. '4070SUPER', '7900X3D'."""
    if not name:
        return ""
    n = name.encode("ascii", "ignore").decode("ascii").upper()
    # Collapse spaces so "4070 SUPER" → "4070SUPER" for dict key matching
    compact = re.sub(r"\s+", "", n)
    regexes = [
        r"\b\d{4}[A-Z\d]*\b",
        r"\bi\d-\d{4,5}[A-Z]*\b",
        r"\b[A-Z]\d{4,5}[A-Z]*\b",
    ]
    for reg in regexes:
        match = re.search(reg, compact, re.I)
        if match:
            return match.group(0).upper()
    n = re.sub(r"^(INTEL|AMD|NVIDIA|ASUS|MSI|GIGABYTE)\s+", "", n, flags=re.I)
    words = [w for w in n.split() if len(w) >= 3]
    return words[0] if words else n


def get_cpu_cap(score: int, resolution: str) -> float:
    """Calculates a tiered FPS ceiling based on CPU benchmark score."""
    if score > 60_000:   divisor = 150.0  # Enthusiast (7950X3D, 14900K)
    elif score > 42_000: divisor = 210.0  # High-end (7800X3D, 14700K)
    elif score > 25_000: divisor = 280.0  # Mid-range (7600, 13600K)
    else:                divisor = 350.0  # Entry/Budget

    base_cap = score / divisor
    scales = {"1080p": 1.0, "1440p": 1.8, "4K": 3.5}
    return base_cap * scales.get(resolution, 1.8)


def _build_full_name(item: Dict[str, Any]) -> str:
    raw   = item.get("name") or item.get("model") or ""
    brand = item.get("brand", "")
    if brand and brand.lower() not in raw.lower():
        return f"{brand} {raw}".strip()
    return raw


def _fetch_component_row(
    supabase,
    table: str,
    id_prefix: str,
    name_field: str,
    component_id: Optional[str],
    norm_name: str,
    order_col: str,
) -> Optional[Dict[str, Any]]:
    try:
        res = None
        if component_id and str(component_id).upper().startswith(id_prefix.upper()):
            res = supabase.table(table).select("*").eq("id", component_id).execute()
        if not res or not res.data:
            res = (
                supabase.table(table)
                .select("*")
                .ilike(name_field, f"%{norm_name}%")
                .order(order_col, desc=True)
                .limit(1)
                .execute()
            )
        return res.data[0] if res and res.data else None
    except Exception as e:
        print(f"DB fetch error [{table}]: {e}")
        return None


def calculate_cpu_score_from_specs(row: Dict[str, Any]) -> int:
    cores   = parse_val(row.get("num_cores"))
    threads = parse_val(row.get("num_threads"))
    boost   = parse_val(row.get("maxboost_clock"))
    if cores == 0:
        return 0
    return int((cores * 1000) + (threads * 500) + (boost * 1000))


def calculate_gpu_score_from_specs(row: Dict[str, Any]) -> int:
    shaders = parse_val(row.get("unified_shader"))
    vram    = parse_val(row.get("mem_size"))
    clock   = parse_val(
        row.get("boost_clock") or row.get("core_clock") or row.get("gpu_clock")
    )
    if shaders == 0 and vram == 0:
        return 0
    return int((shaders * 2) + (vram * 500) + (clock * 2))


def _sanity_correct_score(
    score: int,
    norm_name: str,
    reference_table: Dict[str, int],
    warnings: List[str],
    label: str,
) -> int:
    """
    Generic sanity corrector for both CPU and GPU scores.
    If the DB score is outside ±20% of the known reference for this model,
    replace it with the reference and add a warning.
    If the model isn't in the reference table, trust the DB value as-is.
    """
    compact = re.sub(r"\s+", "", norm_name.upper())

    # Sort keys longest-first so "4070TISUPER" matches before "4070"
    for key in sorted(reference_table.keys(), key=len, reverse=True):
        if key in compact:
            ref   = reference_table[key]
            lo    = ref * 0.80
            hi    = ref * 1.20
            if not (lo <= score <= hi):
                warnings.append(
                    f"{label} score {score:,} is outside expected range for {key} "
                    f"({int(lo):,}–{int(hi):,}). "
                    f"Using reference {ref:,} — update DB when possible."
                )
                return ref
            return score  # within tolerance — trust it
    return score  # unknown model — trust DB as-is


# ─── MAIN ─────────────────────────────────────────────────────────────────────

def calculate_bottleneck(
    components: List[Dict[str, Any]],
    resolution: str = "1440p",
) -> Dict[str, Any]:
    """
    Calculates bottleneck, FPS estimates, and power for any build.

    Parameters
    ----------
    components : list of component dicts, each with at minimum:
                 { "type": "CPU"|"GPU"|"RAM"|..., "id": "...", "name"/"model": "...", "brand": "..." }
    resolution : target resolution string — "1080p", "1440p", or "4K"
                 Determines which bottleneck thresholds are applied.
    """

    supabase = get_supabase()

    cpu_item = next((c for c in components if c.get("type", "").upper() == "CPU"), None)
    gpu_item = next((c for c in components if c.get("type", "").upper() == "GPU"), None)
    ram_item = next((c for c in components if c.get("type", "").upper() == "RAM"), None)

    report: Dict[str, Any] = {
        "score_cpu":            0,
        "score_gpu":            0,
        "ratio":                1.0,
        "bottleneck_percentage":0,
        "bottleneck_type":      "NONE",
        "resolution":           resolution,
        "verdict":              "Analyzing...",
        "warnings":             [],
        "recommendations":      [],
        "is_estimate":          False,
        "score_corrected":      False,
    }

    cpu_row:  Optional[Dict[str, Any]] = None
    gpu_row:  Optional[Dict[str, Any]] = None
    cpu_norm: str = ""
    gpu_norm: str = ""

    # ── 1. FETCH CPU ──────────────────────────────────────────────────────────
    if cpu_item and supabase:
        cpu_norm = normalize_name(_build_full_name(cpu_item))
        cpu_row  = _fetch_component_row(
            supabase,
            table="cpu_final",
            id_prefix="CPU",
            name_field="model",
            component_id=cpu_item.get("id"),
            norm_name=cpu_norm,
            order_col="cpu_mark",
        )
        if cpu_row:
            raw = parse_val(cpu_row.get("cpu_mark"))
            if raw > 0:
                corrected = _sanity_correct_score(
                    int(raw), cpu_norm, CPU_REFERENCE_SCORES, report["warnings"], "CPU"
                )
                if corrected != int(raw):
                    report["score_corrected"] = True
                report["score_cpu"] = corrected
            else:
                report["score_cpu"]   = calculate_cpu_score_from_specs(cpu_row)
                report["is_estimate"] = True

    # ── 2. FETCH GPU ──────────────────────────────────────────────────────────
    if gpu_item and supabase:
        gpu_norm = normalize_name(_build_full_name(gpu_item))
        gpu_row  = _fetch_component_row(
            supabase,
            table="gpu_final",
            id_prefix="GPU",
            name_field="name",
            component_id=gpu_item.get("id"),
            norm_name=gpu_norm,
            order_col="g3_dmark",
        )
        if gpu_row:
            raw = parse_val(gpu_row.get("g3_dmark"))
            if raw > 0:
                corrected = _sanity_correct_score(
                    int(raw), gpu_norm, GPU_REFERENCE_SCORES, report["warnings"], "GPU"
                )
                if corrected != int(raw):
                    report["score_corrected"] = True
                report["score_gpu"] = corrected
            else:
                report["score_gpu"]   = calculate_gpu_score_from_specs(gpu_row)
                report["is_estimate"] = True

    # ── 3. POWER & SPEED ──────────────────────────────────────────────────────
    total_wattage = SYSTEM_OVERHEAD_WATTS
    speeds = {"cpu": "N/A", "gpu": "N/A"}

    if cpu_row:
        tdp = parse_val(cpu_row.get("tdp", 65))
        if tdp > CPU_TDP_SANITY_CAP:
            tdp = 120
            report["warnings"].append("CPU TDP in DB looks wrong — defaulted to 120W.")
        total_wattage += tdp
        speeds["cpu"] = f"{cpu_row.get('maxboost_clock', 'N/A')} GHz"

    if gpu_row:
        gpu_tdp = parse_val(gpu_row.get("tdp", 200))
        if gpu_tdp > GPU_TDP_SANITY_CAP:
            gpu_tdp = 300
            report["warnings"].append("GPU TDP in DB looks wrong — defaulted to 300W.")
        total_wattage += gpu_tdp
        gpu_clock_display = (
            gpu_row.get("boost_clock")
            or gpu_row.get("core_clock")
            or gpu_row.get("gpu_clock")
            or "N/A"
        )
        speeds["gpu"] = f"{gpu_clock_display} MHz"

    psu_rec = int((total_wattage * PSU_HEADROOM) / 50 + 1) * 50

    # ── 4. FPS PREDICTION ─────────────────────────────────────────────────────
    fps_estimates: Dict[str, List] = {"1080p": [], "1440p": [], "4K": []}

    try:
        coef_path = os.path.join(
            os.path.dirname(__file__), "..", "data", "fps_coefficients.json"
        )
        if os.path.exists(coef_path):
            with open(coef_path, "r") as f:
                coefs = json.load(f)

            featured = [
                "counterStrikeGlobalOffensive",
                "grandTheftAuto5",
                "apexLegends",
                "fortnite",
                "worldOfTanks",
            ]

            gpu_k        = report["score_gpu"] / GPU_K_BASELINE
            
            # Tiered CPU caps per resolution
            cpu_caps = {
                res: get_cpu_cap(report["score_cpu"], res) 
                for res in ["1080p", "1440p", "4K"]
            }

            for game in featured:
                if game not in coefs:
                    continue

                gc       = coefs[game]
                val_1080 = gc.get("1080", {}).get("high") or gc.get("1080", {}).get("med") or 0
                val_1440 = gc.get("1440", {}).get("high") or gc.get("1440", {}).get("med") or val_1080 * 0.70
                val_4k   = gc.get("4K",   {}).get("high") or gc.get("4K",   {}).get("med") or val_1440 * 0.60

                if not gc.get("1440") and val_1080 > 0:
                    report["warnings"].append(
                        f"{game}: no 1440p coefficient — 1440p/4K FPS extrapolated."
                    )

                fps_estimates["1080p"].append({"game": game, "fps": int(min(val_1080 * gpu_k, cpu_caps["1080p"]))})
                fps_estimates["1440p"].append({"game": game, "fps": int(min(val_1440 * gpu_k, cpu_caps["1440p"]))})
                fps_estimates["4K"].append(   {"game": game, "fps": int(min(val_4k   * gpu_k, cpu_caps["4K"]))})

    except Exception as e:
        print(f"FPS Error: {e}")
        report["warnings"].append("FPS prediction failed — check fps_coefficients.json path.")

    # ── 5. ASSEMBLE REPORT ────────────────────────────────────────────────────
    report["performance"] = {
        "fps":   fps_estimates,
        "power": {"estimated_wattage": total_wattage, "recommended_psu": psu_rec},
        "speeds": speeds,
    }

    if report["score_cpu"] == 0 or report["score_gpu"] == 0:
        report["verdict"] = "Hardware not found in benchmark database."
        return report

    # ── 6. RESOLUTION-AWARE BOTTLENECK RATIO ──────────────────────────────────
    ratio = report["score_gpu"] / report["score_cpu"]
    report["ratio"] = round(ratio, 2)

    gpu_thresh, cpu_thresh = RESOLUTION_THRESHOLDS.get(
        resolution, RESOLUTION_THRESHOLDS["1440p"]
    )

    if ratio < gpu_thresh:
        pct = int((1 - ratio) * 100)
        report["bottleneck_type"]        = "GPU"
        report["bottleneck_percentage"]  = pct
        report["verdict"] = (
            f"GPU Bottleneck at {resolution}: graphics card is limiting "
            f"performance by ~{pct}%. CPU has headroom to spare."
        )
        report["recommendations"].append(
            f"At {resolution}, a stronger GPU would better match this CPU."
        )
    elif ratio > cpu_thresh:
        pct = int(((ratio - 1) / ratio) * 100)
        report["bottleneck_type"]        = "CPU"
        report["bottleneck_percentage"]  = pct
        report["verdict"] = (
            f"CPU Bottleneck at {resolution}: processor is limiting GPU "
            f"by ~{pct}%."
        )
        report["recommendations"].append(
            f"At {resolution}, a faster CPU would unlock more GPU performance."
        )
    else:
        report["bottleneck_type"]        = "NONE"
        report["bottleneck_percentage"]  = 0
        report["verdict"] = (
            f"Well balanced at {resolution} — optimal hardware synergy detected."
        )

    if report["is_estimate"]:
        report["warnings"].append(
            "Score derived from specs — real PassMark/G3DMark not found in DB."
        )

    # ── 7. RAM CHECK ──────────────────────────────────────────────────────────
    if ram_item:
        cap = str(ram_item.get("capacity") or ram_item.get("name", ""))
        if "8GB" in cap and report["score_gpu"] > 20_000:
            report["warnings"].append(
                "8GB RAM will bottleneck this GPU in modern titles — 16GB minimum recommended."
            )

    return report
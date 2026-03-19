import os
from dotenv import load_dotenv
from supabase import create_client

# Load from backend/.env relative to this file
dotenv_path = os.path.join(os.path.dirname(__file__), '..', '.env')
load_dotenv(dotenv_path)

def test_fetch_prices():
    url = os.getenv("MAIN_SUPABASE_URL")
    key = os.getenv("MAIN_SUPABASE_KEY")

    if not url or not key:
        print("Warning: MAIN_SUPABASE_URL or MAIN_SUPABASE_KEY is not set. Skipping live fetch test.")
        return

    supabase = create_client(url, key)

    price_columns = {
        "cpu_final": "estimated_price",
        "gpu_final": "estimated_lkr_price"
    }

    def check(table, target, order_by):
        pcol = price_columns[table]
        try:
            q = supabase.table(table).select("*").gt(pcol, 0).lte(pcol, target * 1.3).order(order_by, desc=True).limit(5)
            r = q.execute()
            print(f"[{table}] order by {order_by} length:", len(r.data))
        except Exception as e:
            print(f"[{table}] Exception with {order_by}:", e)

    check("cpu_final", 100000, "cpu_mark")
    check("gpu_final", 175000, "g3_dmark")

if __name__ == "__main__":
    test_fetch_prices()

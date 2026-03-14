import asyncio
import json
from app.routers import component_identification

async def test_summary():
    print("--- Testing Build Summary Extraction (KV Format) ---")
    
    # 1. Reset Session
    await component_identification.reset_session(mode="standard")
    
    # 2. Mock some identified details
    mock_gpu = {
        "model": "NVIDIA GeForce RTX 3080",
        "brand": "NVIDIA",
        "component_type": "GPU",
        "is_db_verified": True,
        "quantity": 1
    }
    mock_ram = {
        "model": "Corsair Vengeance LPX",
        "brand": "Corsair",
        "component_type": "RAM",
        "is_db_verified": True,
        "quantity": 2
    }
    
    print("Simulating identification of GPU and RAM (x2)...")
    component_identification.global_tracker.update_details("GPU", mock_gpu)
    component_identification.global_tracker.update_details("RAM", mock_ram)
    
    # 3. Test Endpoint Response
    print("\nFetching summary via get_build_summary()...")
    summary = await component_identification.get_build_summary()
    print(json.dumps(summary, indent=2))
    
    # 4. Test Literal Function
    print("\nTesting generate_build_json()...")
    json_output = component_identification.generate_build_json()
    print(json_output)
    
    # Assertions
    if isinstance(summary, list) and len(summary) == 1:
        data = summary[0]
        if "GPU" in data and "RAM" in data and "RAM_quantity" in data:
            if data["RAM_quantity"] == 2:
                print("\n✅ Verification SUCCESS: All components and quantities found in KV summary.")
            else:
                print(f"\n❌ Verification FAILED: RAM_quantity is {data.get('RAM_quantity')}, expected 2.")
        else:
            print("\n❌ Verification FAILED: Missing expected keys (GPU, RAM, or RAM_quantity).")
    else:
        print(f"\n❌ Verification FAILED: Summary format is incorrect. Expected list with 1 object.")

if __name__ == "__main__":
    asyncio.run(test_summary())

if __name__ == "__main__":
    asyncio.run(test_summary())

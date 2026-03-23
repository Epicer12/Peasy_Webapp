import requests
import json

def test_hydration():
    # Use a real build ID if possible, or just mock the logic if needed
    # But since I can't easily get a real ID without listing all builds,
    # I'll just try to fetch the list first.
    
    base_url = "http://localhost:8000" # Assuming backend is running here
    try:
        # 1. Get builds list
        res = requests.get(f"{base_url}/api/community/builds?limit=1")
        if res.status_code == 200 and res.json():
            build_id = res.json()[0]['id']
            print(f"Found build ID: {build_id}")
            
            # 2. Get build details
            detail_res = requests.get(f"{base_url}/api/community/builds/{build_id}")
            if detail_res.status_code == 200:
                data = detail_res.json()
                components = data.get("components", [])
                print(f"Fetched {len(components)} components.")
                for comp in components:
                    print(f"- {comp.get('name')} ({comp.get('type')})")
                    if 'specs' in comp:
                        print(f"  Specs: {comp['specs']}")
                    if 'image_url' in comp:
                        print(f"  Image: {comp['image_url']}")
            else:
                print(f"Error fetching details: {detail_res.status_code}")
        else:
            print(f"No builds found or error: {res.status_code}")
    except Exception as e:
        print(f"Error connecting to backend: {e}")

if __name__ == "__main__":
    test_hydration()

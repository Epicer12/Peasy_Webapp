import requests
import json

req = {
    "summary": {
        "basicPreferences": {
            "budget": { "min": "300000", "max": "500000" },
            "purpose": ["Gaming"],
            "performance": "High-End",
            "cpuBrand": "No preference",
            "gpuBrand": "No preference"
        }
    }
}

try:
    res = requests.post("http://localhost:8000/api/generate-builds", json=req)
    print("STATUS:", res.status_code)
    try:
        print("RESPONSE:", json.dumps(res.json(), indent=2))
    except json.JSONDecodeError:
        print("RESPONSE TEXT:", res.text)
    except Exception as e:
        print("Error processing response:", e)
except Exception as e:
    print("Request failed:", e)

import os
import requests
from dotenv import load_dotenv

load_dotenv()

OPENROUTER_KEY     = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_ALT_KEY = os.getenv("OPENROUTER_API_KEY_ALT")
GROQ_KEY           = os.getenv("GROQ_API_KEY")
NVIDIA_KEY         = os.getenv("NVIDIA_API_KEY")

missing = [name for name, val in {
    "OPENROUTER_API_KEY":     OPENROUTER_KEY,
    "OPENROUTER_API_KEY_ALT": OPENROUTER_ALT_KEY,
    "GROQ_API_KEY":           GROQ_KEY,
    "NVIDIA_API_KEY":         NVIDIA_KEY,
}.items() if not val]

if missing:
    print(f"WARNING: The following keys are not set in .env: {', '.join(missing)}")

tests = [
    ("Groq",         "https://api.groq.com/openai/v1/chat/completions",          GROQ_KEY,           "llama-3.3-70b-versatile"),
    ("OpenRouter 1", "https://openrouter.ai/api/v1/chat/completions",            OPENROUTER_KEY,     "google/gemini-2.0-flash-001"),
    ("OpenRouter 2", "https://openrouter.ai/api/v1/chat/completions",            OPENROUTER_ALT_KEY, "google/gemini-2.0-flash-001"),
    ("NVIDIA API",   "https://integrate.api.nvidia.com/v1/chat/completions",     NVIDIA_KEY,         "meta/llama-3.3-70b-instruct"),
]

for name, url, key, model in tests:
    if not key:
        print(f"[{name}] SKIPPED — key not set in .env")
        continue
    headers = {
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json"
    }
    data = {
        "model": model,
        "messages": [{"role": "user", "content": "Say hello"}],
        "max_tokens": 10
    }
    try:
        res = requests.post(url, headers=headers, json=data, timeout=10)
        if res.status_code == 200:
            print(f"[{name}] SUCCESS - {model}")
        else:
            print(f"[{name}] FAILED ({res.status_code}) - {model}")
            try:
                print("  Response:", res.json())
            except Exception:
                print("  Response:", res.text)
    except Exception as e:
        print(f"[{name}] ERROR: {e}")

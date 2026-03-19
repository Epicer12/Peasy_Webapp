import os
import json
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()
deepseek_api_key = os.getenv("DEEPSEEK_API_KEY")

try:
    print(f"Key exists: {bool(deepseek_api_key)}")
    client = OpenAI(base_url="https://api.deepseek.com", api_key=deepseek_api_key)
    response = client.chat.completions.create(
        model="deepseek-chat",
        messages=[
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": "Hello!"}
        ],
        temperature=0.2
    )
    print(response.choices[0].message.content)
except Exception as e:
    print(f"Error: {e}")

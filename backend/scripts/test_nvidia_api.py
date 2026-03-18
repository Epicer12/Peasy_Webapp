import os
from dotenv import load_dotenv
from openai import OpenAI
from app.routers.build_suggestions import system_prompt, user_prompt, clean_build_result

load_dotenv()

NVIDIA_KEY = os.getenv("NVIDIA_API_KEY")
if not NVIDIA_KEY:
    raise RuntimeError("NVIDIA_API_KEY is not set in .env")

client = OpenAI(base_url="https://integrate.api.nvidia.com/v1", api_key=NVIDIA_KEY)
model_name = "meta/llama-3.1-405b-instruct"

try:
    response = client.chat.completions.create(
        model=model_name,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": "Just generate empty response to test it"}
        ],
        temperature=0.2,
        max_tokens=6144
    )
    content = response.choices[0].message.content
    print("SUCCESS: ", content[:200])
except Exception as e:
    print("NVIDIA Error: ", e)

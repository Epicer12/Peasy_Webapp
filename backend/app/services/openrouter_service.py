import os
import json
import base64
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=os.getenv("OPENROUTER_API_KEY"),
)

async def extract_warranty_info(image_content: bytes):
    """
    Extracts warranty information from an image using OpenRouter (Gemini 2.0 Flash).
    """
    base64_image = base64.b64encode(image_content).decode("utf-8")
    
    prompt = """
    Analyze this image of a warranty proof or receipt. 
    Extract the following information and return it as a JSON object:
    {
        "user_name": "Full name of the customer if mentioned, else null",
        "user_id": "Any unique identifier for the user/customer if mentioned (e.g., membership ID), else null",
        "warranty_info": {
            "product_name": "Name of the product",
            "purchase_date": "Date of purchase",
            "warranty_period": "Duration of warranty",
            "serial_number": "Serial number of the product if visible",
            "additional_details": "Any other relevant warranty terms mentioned"
        }
    }
    Only return the JSON object, nothing else.
    """

    try:
        response = client.chat.completions.create(
            model="google/gemini-2.0-flash-001",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{base64_image}"
                            },
                        },
                    ],
                }
            ],
        )
        
        content = response.choices[0].message.content
        # Clean up the response in case the model returns markdown code blocks
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content:
            content = content.split("```")[1].split("```")[0].strip()
            
        return json.loads(content)
    except Exception as e:
        print(f"Error calling OpenRouter: {e}")
        return {
            "user_name": None,
            "user_id": None,
            "warranty_info": {"error": f"Failed to extract info: {str(e)}"}
        }

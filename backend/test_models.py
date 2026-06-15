import os
from google import genai
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")
print("Testing REST API Generate Content with key:", api_key[:10] + "..." + api_key[-10:] if api_key else "None")

try:
    client = genai.Client(api_key=api_key)
    print("Sending REST API generation request...")
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents="Say hello and tell me if you can hear me."
    )
    print("-> SUCCESS! Response from Gemini REST API:")
    print(response.text)
except Exception as e:
    print("-> FAILED for REST API Generate Content:")
    print(e)

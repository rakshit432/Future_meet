import os
import asyncio
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()

async def test_model(client, model_name):
    print(f"Connecting to model {model_name}...")
    try:
        async with client.aio.live.connect(model=model_name, config={"response_modalities": ["TEXT"]}) as session:
            print(f"-> SUCCESS: Connected to {model_name}!")
            return True
    except Exception as e:
        print(f"-> FAILED for {model_name}: {e}")
        return False

async def main():
    api_key = os.getenv("GEMINI_API_KEY")
    client = genai.Client(api_key=api_key, http_options=types.HttpOptions(api_version="v1alpha"))
    
    models_to_test = [
        "gemini-2.0-flash",
        "gemini-2.5-flash-native-audio-latest",
        "gemini-2.5-flash-native-audio-preview-12-2025",
        "gemini-3.1-flash-live-preview",
    ]
    
    for model in models_to_test:
        success = await test_model(client, model)
        if success:
            print(f"Model {model} succeeded!")

asyncio.run(main())

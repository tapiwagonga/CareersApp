import os
from pathlib import Path
from dotenv import load_dotenv
from google import genai

# Load Key
env_path = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=env_path)
key = os.getenv("GEMINI_API_KEY")

client = genai.Client(api_key=key)

print("🔍 Scanning available models for your API Key...")
print("-" * 40)

try:
    # List all models
    count = 0
    for model in client.models.list():
        # filter for 'generateContent' capable models
        if "generateContent" in model.supported_generation_methods:
            print(f"✅ FOUND: {model.name}")
            # print(f"   (ID: {model.name.split('/')[-1]})")
            count += 1

    if count == 0:
        print("❌ No models found. This usually means the API Key is invalid or has no access.")
    else:
        print("-" * 40)
        print(f"Total available models: {count}")
        
except Exception as e:
    print(f"❌ ERROR: {e}")

import os
from dotenv import load_dotenv
from google import genai

load_dotenv()

key = os.getenv("GEMINI_API_KEY")
print(f"1. Checking Key: {key[:5]}... (Length: {len(key) if key else 0})")

if not key:
    print("❌ ERROR: No API Key found in .env")
    exit()

try:
    client = genai.Client(api_key=key)
    print("2. Client initialized. Sending test request...")
    
    response = client.models.generate_content(
        model="gemini-2.0-flash",
        contents="Explain what an API is in one sentence."
    )
    print(f"✅ SUCCESS: {response.text}")

except Exception as e:
    print(f"❌ CONNECTION ERROR: {e}")
    print("Tip: If you see '404', check if you have access to gemini-2.0-flash.")
    print("Tip: If you see '400', check your API key.")
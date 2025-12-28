import os
from dotenv import load_dotenv

# 1. Load Key
try:
    load_dotenv()
    key = os.getenv("GEMINI_API_KEY")
    if not key:
        print("❌ ERROR: API Key not found in .env file")
        exit(1)
    print(f"🔑 Key loaded: {key[:5]}...")
except Exception as e:
    print(f"❌ ERROR loading .env: {e}")
    exit(1)

# 2. Import Google GenAI (V2)
try:
    from google import genai
    print("✅ Library 'google-genai' found.")
except ImportError:
    print("❌ ERROR: Library 'google-genai' is missing.")
    print("Run: ./venv/bin/pip install google-genai")
    exit(1)

# 3. Test Connection
client = genai.Client(api_key=key)

# The list of likely models to try
models_to_try = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-2.0-flash-exp"]

print("\n📡 Testing Models...")
for model_name in models_to_try:
    print(f"👉 Trying: {model_name}...", end=" ")
    try:
        response = client.models.generate_content(
            model=model_name,
            contents="Hello, are you online?",
        )
        print("✅ SUCCESS!")
        print(f"\n🎉 WINNER: You should use '{model_name}' in your backend.")
        print(f"Response: {response.text}")
        exit(0) # Stop after finding one that works
    except Exception as e:
        if "404" in str(e):
            print("❌ Not Found (404)")
        elif "429" in str(e):
            print("❌ Quota Exceeded (429)")
        else:
            print(f"❌ Error: {str(e)[:100]}...")

print("\n❌ ALL FAILED. Trying to list available models...")
try:
    for m in client.models.list():
        if "generateContent" in m.supported_generation_methods:
            print(f"   - Found: {m.name}")
except Exception as e:
    print(f"Could not list models: {e}")

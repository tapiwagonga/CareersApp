import os
from pathlib import Path
from dotenv import load_dotenv

# Attempt to import the new library
try:
    from google import genai
    print("✅ Library 'google-genai' is installed.")
except ImportError:
    print("❌ ERROR: Library 'google-genai' is NOT installed.")
    exit(1)

# Load Environment Variables
env_path = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=env_path)
key = os.getenv("GEMINI_API_KEY")

print("--- DIAGNOSTIC START ---")
print(f"1. Key Found? {'YES' if key else 'NO'}")

if key:
    # Check for the common 'AA' typo
    print(f"2. Key Start: '{key[:4]}...' (Should be 'AIza')")
    
    try:
        print("3. Connecting to Google Gemini (UK Check)...")
        client = genai.Client(api_key=key)
        
        # Test the connection
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents="Are you online?"
        )
        print(f"4. ✅ SUCCESS! System is working. AI said: {response.text}")

    except Exception as e:
        print("\n❌ CONNECTION FAILED")
        print("------------------------------------------------")
        print(f"ERROR DETAILS: {e}")
        print("------------------------------------------------")
        if "400" in str(e) or "location" in str(e).lower():
            print("⚠️ LOCATION ISSUE: Google Gemini Free Tier is often blocked in the UK/EU.")
            print("   You may need to enable billing on Google Cloud console.")
else:
    print("❌ ERROR: .env file is empty or missing.")

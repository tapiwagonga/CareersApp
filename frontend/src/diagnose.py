cat << 'EOF' > diagnose.py
import os
from pathlib import Path
from dotenv import load_dotenv
from google import genai

env_path = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=env_path)
key = os.getenv("GEMINI_API_KEY")

try:
    print("📡 Testing with Stable Model (gemini-1.5-flash)...")
    client = genai.Client(api_key=key)
    
    # CHANGED: Using 1.5 instead of 2.0
    response = client.models.generate_content(
        model="gemini-1.5-flash", 
        contents="Are you online?"
    )
    print(f"✅ SUCCESS! AI Replied: {response.text}")

except Exception as e:
    print(f"❌ ERROR: {e}")
EOF
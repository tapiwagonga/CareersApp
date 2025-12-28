import os
from pathlib import Path
from dotenv import load_dotenv
from google import genai

# 1. Load Key
env_path = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=env_path)
my_key = os.getenv("GEMINI_API_KEY")

# 2. Initialize Client (The Official Way)
client = genai.Client(api_key=my_key)

print("📡 Connecting using Official GenAI V2 Syntax...")

try:
    # 3. Call the model
    response = client.models.generate_content(
        model="gemini-1.5-flash",  # <--- The correct stable model name
        contents="Explain how AI works in a few words",
    )
    
    print("\n✅ SUCCESS!")
    print(response.text)

except Exception as e:
    print(f"\n❌ ERROR: {e}")

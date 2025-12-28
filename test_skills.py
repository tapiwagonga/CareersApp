import sys
import os
import json

# Add current folder to path so we can find 'backend'
sys.path.append(os.getcwd())

try:
    print("1. Importing AI Agent...")
    from backend.ai_agent import extract_skills_from_jd
    print("✅ Import successful.")

    dummy_jd = "We need a Senior Python Developer with React and AWS experience."

    print("2. Testing Skill Extraction...")
    result = extract_skills_from_jd(dummy_jd)

    if result:
        print("\n✅ SUCCESS! Skills Extracted:")
        print(json.dumps(result, indent=2))
    else:
        print("\n❌ FAILED: Function returned None.")
        print("Check the logs above for the specific Gemini error.")

except Exception as e:
    print(f"\n❌ CRITICAL SCRIPT ERROR: {e}")

import sys
import os

# 1. Add the current directory to Python path so we can find 'backend'
sys.path.append(os.getcwd())

try:
    print("1. Importing AI Agent...")
    from backend.ai_agent import extract_skills_from_jd
    print("✅ Import successful.")

    # 2. Define a dummy Job Description
    dummy_jd = """
    We are looking for a Senior Software Engineer.
    Must have experience with Python, FastAPI, and React.
    Knowledge of AWS and Docker is a plus.
    Good communication skills required.
    """

    print("\n2. Calling extract_skills_from_jd()...")
    
    # 3. Call the function directly
    result = extract_skills_from_jd(dummy_jd)

    # 4. Check results
    if result:
        print("\n✅ SUCCESS! Skills Extracted:")
        print(result)
    else:
        print("\n❌ FAILED: Function returned None.")
        print("(This usually means the try/except block in ai_agent.py caught an error.)")

except Exception as e:
    print(f"\n❌ CRITICAL ERROR: {e}")
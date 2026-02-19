import requests
import time
import sys

BASE_URL = "http://localhost:8000/api/v1"

def print_pass(msg):
    print(f"✅ PASS: {msg}")

def print_fail(msg, err=""):
    print(f"❌ FAIL: {msg} | {err}")
    sys.exit(1)

def test_health():
    try:
        r = requests.get("http://localhost:8000/")
        if r.status_code == 200: print_pass("Server is running")
        else: print_fail("Server returned non-200")
    except: print_fail("Cannot connect to localhost:8000")

def test_analysis():
    print("⏳ Testing Roadmap Generation (this takes ~5s)...")
    payload = {
        "role_name": "Frontend Developer",
        "user_skills": {"JavaScript": 3, "React": 2},
        "preferences": {
            "experienceLevel": "Junior",
            "learningStyle": "Visual",
            "hoursPerWeek": 10,
            "timeline": "Standard"
        }
    }
    r = requests.post(f"{BASE_URL}/analyze", json=payload)
    if r.status_code == 200 and "roadmap" in r.json():
        print_pass(f"Roadmap generated with {len(r.json()['roadmap'])} phases")
    else:
        print_fail("Roadmap generation failed", r.text)

def test_grading():
    print("⏳ Testing Project Grading...")
    payload = {
        "task_title": "Build a To-Do App",
        "requirements": "Must use React and LocalStorage",
        "user_input": "https://github.com/test/repo"
    }
    r = requests.post(f"{BASE_URL}/grade-project", json=payload)
    data = r.json()
    if r.status_code == 200 and "passed" in data:
        print_pass(f"Grading Logic: {data['feedback']}")
    else:
        print_fail("Grading failed", r.text)

def test_interview():
    print("⏳ Testing Interview Coach...")
    payload = {
        "history": [],
        "last_user_answer": "I am ready to start.",
        "role": "Frontend Developer",
        "company": "Google"
    }
    r = requests.post(f"{BASE_URL}/interview/next", json=payload)
    data = r.json()
    if r.status_code == 200 and "text" in data:
        print_pass(f"Interviewer Response: \"{data['text'][:50]}...\"")
    else:
        print_fail("Interview turn failed", r.text)

if __name__ == "__main__":
    print("🚀 STARTING SYSTEM DIAGNOSTICS...")
    test_health()
    test_analysis()
    test_grading()
    test_interview()
    print("\n🎉 ALL SYSTEMS GO. Your Backend is ready for the Frontend.")
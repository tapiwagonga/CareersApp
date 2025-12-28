import os
import json
import time
import logging
import uuid
from typing import List, Dict, Any, Optional
from functools import lru_cache
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()
logger = logging.getLogger(__name__)

api_key = os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=api_key) if api_key else None

# --- CONFIGURATION ---
MODEL_FAST = "gemini-2.5-flash" 
MODEL_SMART = "gemini-2.5-pro"

# --- HELPER: CLEAN AI OUTPUT ---
# This is crucial. The AI often adds ```json ... ``` which breaks the app.
def clean_json_text(text: str) -> str:
    # Remove markdown code blocks
    text = text.replace("```json", "").replace("```", "")
    return text.strip()

def get_ai_analysis(role: str, skill: str, current: int, target: int):
    # Pure logic (Instant)
    gap = target - current
    priority = "High" if gap > 3 else "Medium"
    if gap <= 1: priority = "Low"
    return { "priority": priority, "estimated_hours": max(gap * 4, 2) }

@lru_cache(maxsize=50)
def extract_skills_from_jd(description: str) -> List[Dict[str, Any]]:
    if not client: return []
    
    clean_desc = description[:12000]

    prompt = f"""
    ROLE: Principal Talent Architect.
    TASK: Analyze the Job Description to build a 'Target Competency Matrix'.
    
    QUALITY RULES:
    1. SPECIFICITY: Do not list "Database". List "PostgreSQL".
    2. EVIDENCE: Extract 3-8 word snippets proving requirement.
    3. PRIORITIZATION: Mark 'Critical' vs 'Bonus'.
    
    INPUT TEXT:
    {clean_desc}
    """

    try:
        time.sleep(1) # Pacing
        response = client.models.generate_content(
            model=MODEL_FAST,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema={
                    "type": "ARRAY",
                    "items": {
                        "type": "OBJECT",
                        "properties": {
                            "skill": { "type": "STRING" },
                            "category": { "type": "STRING" },
                            "importance": { "type": "STRING", "enum": ["Critical", "Bonus"] },
                            "context": { "type": "STRING" }
                        },
                        "required": ["skill", "category", "importance", "context"]
                    }
                }
            )
        )
        return json.loads(clean_json_text(response.text)) # <--- Clean before loading

    except Exception as e:
        logger.error(f"Extraction Failed: {e}")
        return []

@lru_cache(maxsize=100)
def generate_batch_resources(skills_json: str, user_level: str, timeline: str) -> Dict[str, Any]:
    skills_list = json.loads(skills_json)
    
    # --- ROBUST FALLBACK (Fixes the 500 Crash) ---
    def create_procedural_fallback(s_list):
        logger.info("⚠️ API Limit Hit: Generating procedural resources.")
        fallback = {}
        for s in s_list:
            # FIX: Handle both Dict and String inputs safely
            if isinstance(s, dict):
                skill_name = s.get('skill_name') or s.get('skill') or "Unknown"
            else:
                skill_name = str(s)
            
            fallback[skill_name] = [
                {
                    "title": f"{skill_name} Official Docs",
                    "provider": "Official Docs",
                    "type": "Article",
                    "duration": "Ref",
                    "query": f"{skill_name} official documentation",
                    "reason": "Official source of truth."
                }
            ]
        return fallback

    if not client: return create_procedural_fallback(skills_list)

    try:
        time.sleep(1) 

        prompt = f"""
        ROLE: Technical Curriculum Director.
        TASK: Generate search queries for these skills: {skills_json}
        CONTEXT: Level: {user_level}, Strategy: {timeline}
        OUTPUT: JSON Map {{ "SkillName": [Resource1, Resource2] }}
        """

        response = client.models.generate_content(
            model=MODEL_FAST,
            contents=prompt,
            config=types.GenerateContentConfig(response_mime_type="application/json")
        )
        # CRITICAL FIX: Clean the text before parsing
        return json.loads(clean_json_text(response.text))

    except Exception as e:
        logger.warning(f"Batch API Error: {e}")
        return create_procedural_fallback(skills_list)


# --- THE BOOTCAMP SYLLABUS ENGINE ---
def generate_weekly_roadmap(gaps: List[Dict], prefs: Any) -> List[Dict]:
    # 1. Sort gaps by priority
    gaps.sort(key=lambda x: (x.get('priority') != 'High', x.get('estimated_hours', 0)))
    
    # 2. Timeline Logic
    timeline_map = {"Urgent": 2, "Standard": 4, "LongTerm": 8}
    total_weeks = timeline_map.get(getattr(prefs, 'timeline', 'Standard'), 4)
    weekly_capacity = getattr(prefs, 'hoursPerWeek', 10)
    
    # 3. Bin Packing (Group Skills into Weeks)
    weeks_content = [[] for _ in range(total_weeks)]
    current_week = 0
    current_hours = 0
    
    for gap in gaps:
        cost = gap.get('estimated_hours', 2)
        if current_hours + cost > weekly_capacity and current_week < total_weeks - 1:
            current_week += 1
            current_hours = 0
        weeks_content[current_week].append(gap)
        current_hours += cost

    roadmap = []

    # 4. Generate Rich Content for Each Week
    for i, week_skills in enumerate(weeks_content):
        if not week_skills: continue
        
        week_num = i + 1
        # Extract just the names for the label
        skill_names = [s['skill_name'] for s in week_skills]
        week_focus = ", ".join(skill_names[:2]) # Top 2 skills
        
        tasks = []
        
        # Create Syllabus Items (Video, Book, Project)
        for skill in week_skills:
            s_name = skill['skill_name']
            
            # A. Watch Task
            tasks.append({
                "id": str(uuid.uuid4()),
                "type": "Watch",
                "title": f"Learn {s_name}: Core Concepts",
                "description": f"Watch a deep-dive tutorial on {s_name}.",
                "estimated_minutes": 45,
                "meta": {
                    "url": f"[https://www.youtube.com/results?search_query=](https://www.youtube.com/results?search_query=){s_name}+crash+course",
                    "platform": "YouTube",
                    "author": "Top Instructor"
                },
                "status": "Pending"
            })

            # B. Read Task
            tasks.append({
                "id": str(uuid.uuid4()),
                "type": "Read",
                "title": f"{s_name} Documentation",
                "description": "Read the official getting started guide.",
                "estimated_minutes": 30,
                "meta": {
                    "url": f"[https://www.google.com/search?q=](https://www.google.com/search?q=){s_name}+official+docs",
                    "platform": "Official Docs",
                    "author": "Maintainers"
                },
                "status": "Pending"
            })

        # C. Capstone Project
        tasks.append({
            "id": str(uuid.uuid4()),
            "type": "Build",
            "title": f"Week {week_num} Capstone: {week_focus} Demo",
            "description": f"Build a small prototype combining {week_focus}.",
            "estimated_minutes": 90,
            "meta": {
                "url": "[https://github.com/new](https://github.com/new)",
                "platform": "VS Code"
            },
            "status": "Pending"
        })

        roadmap.append({
            "week_number": week_num,
            "label": f"Phase {week_num}: {week_focus}",
            "focus_area": week_focus,
            "description": f"Master {week_focus} through {len(tasks)} targeted modules.",
            "tasks": tasks,
            "total_hours": round(sum([t['estimated_minutes'] for t in tasks]) / 60, 1)
        })

    return roadmap
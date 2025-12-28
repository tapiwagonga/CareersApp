import os
import io
import json
import logging
import traceback
from typing import List, Dict, Optional, Any
from pathlib import Path
from dotenv import load_dotenv

from fastapi import FastAPI, HTTPException, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pdfplumber

from google import genai
from google.genai import types

# --- CONFIGURATION ---
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

# --- IMPORTS FROM AI AGENT ---
# These must match exactly what is in ai_agent.py
from backend.ai_agent import (
    extract_skills_from_jd, 
    get_ai_analysis, 
    clean_json_text, 
    generate_weekly_roadmap, 
    generate_batch_resources
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# --- AI CLIENT ---
api_key = os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=api_key) if api_key else None

# SYNCED MODEL: Using the same one as ai_agent.py
# We use the variable so we can change it in one place if needed
CV_MODEL = "gemini-2.5-flash" 

# --- CORS ---
origins = ["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:5173"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- DATA MODELS ---
class ExtractionRequest(BaseModel):
    description: str

class UserPreferences(BaseModel):
    experienceLevel: str 
    learningStyle: str
    hoursPerWeek: int
    timeline: str = "Standard"

class AnalysisRequest(BaseModel):
    role_name: str
    user_skills: Dict[str, int]
    preferences: Optional[UserPreferences] = None

# --- ENDPOINTS ---

@app.get("/")
def health_check():
    return {"status": "ok", "message": "CareerArchitect API is running"}

@app.post("/api/v1/extract-skills")
def extract_skills_endpoint(request: ExtractionRequest):
    logger.info("received extraction request")
    try:
        # ai_agent.py handles the logic and schema
        skills = extract_skills_from_jd(request.description)
        return {"skills": skills}
    except Exception as e:
        logger.error(f"Extraction failed: {e}")
        return {"skills": []}

@app.post("/api/v1/scan-cv")
async def scan_cv_endpoint(file: UploadFile = File(...)):
    try:
        content = await file.read()
        text = ""
        with pdfplumber.open(io.BytesIO(content)) as pdf:
            for page in pdf.pages:
                text += (page.extract_text() or "") + "\n"
        
        if len(text) < 50: return {}
        if not client: return {}

        prompt = f"""
        ROLE: Technical Recruiter.
        TASK: Extract technical skills and estimate proficiency (1-10) based on experience.
        OUTPUT: JSON Object {{ "SkillName": Score }}
        RESUME: {text[:10000]} 
        """

        try:
            response = client.models.generate_content(
                model=CV_MODEL,
                contents=prompt,
                config=types.GenerateContentConfig(response_mime_type="application/json")
            )
            cleaned_text = clean_json_text(response.text)
            data = json.loads(cleaned_text)
            # Filter for valid integers
            return {k: int(v) for k, v in data.items() if isinstance(v, (int, float)) or (isinstance(v, str) and v.isdigit())}
        except Exception as e:
            logger.error(f"CV Scan Model Failed: {e}")
            return {}

    except Exception as e:
        logger.error(f"CV Scan Endpoint Failed: {e}")
        return {}

@app.post("/api/v1/analyze")
def analyze_skills(request: AnalysisRequest):
    logger.info(f"🚀 Architecting Strategic Roadmap for: {request.role_name}")
    
    try:
        prefs = request.preferences or UserPreferences(
            experienceLevel="Mid", learningStyle="Visual", hoursPerWeek=10, timeline="Standard"
        )

        target_level = 8
        gaps = []
        skills_for_ai = [] 

        # 1. Identify Gaps
        for skill, current_level in request.user_skills.items():
            if current_level < target_level:
                meta = get_ai_analysis(request.role_name, skill, current_level, target_level)
                skills_for_ai.append({"skill": skill, "priority": meta["priority"]})
                
                gaps.append({
                    "skill_name": skill,
                    "current_level": current_level,
                    "target_level": target_level,
                    "priority": meta["priority"],
                    "estimated_hours": meta["estimated_hours"],
                    "resources": [] 
                })

        # 2. Batch Resource Generation (1 Call)
        if skills_for_ai:
            skills_json = json.dumps(skills_for_ai)
            resource_map = generate_batch_resources(
                skills_json, 
                prefs.experienceLevel, 
                prefs.timeline
            )
            
            # Map results
            for gap in gaps:
                gap["resources"] = resource_map.get(gap["skill_name"], [])
                # Safety fallback if map is missing keys
                if not gap["resources"]:
                     gap["resources"] = [{
                        "title": f"{gap['skill_name']} Documentation",
                        "provider": "Official Docs",
                        "type": "Article",
                        "duration": "Ref",
                        "query": f"{gap['skill_name']} documentation"
                    }]

        # 3. Roadmap Generation
        roadmap = generate_weekly_roadmap(gaps, prefs)

        # 4. Match Score Calculation
        total_score = sum(request.user_skills.values())
        max_possible = len(request.user_skills) * 10
        match_percentage = int((total_score / max_possible) * 100) if max_possible > 0 else 0
        
        logger.info("✅ Analysis Complete.")
        
        return {
            "role_name": request.role_name,
            "match_percentage": match_percentage,
            "roadmap": roadmap,
            "missing_skills": gaps
        }

    except Exception as e:
        logger.error(f"Analysis Failed: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))
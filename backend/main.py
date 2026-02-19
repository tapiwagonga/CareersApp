import io
import json
import logging
import os
import traceback
from pathlib import Path
from typing import Any, Dict, List, Optional

import pdfplumber
from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from google import genai
from google.genai import types
from pydantic import BaseModel

from backend.ai_agent import (
    clean_json_text,
    extract_skills_from_jd,
    generate_dynamic_roadmap,
    generate_interview_response,
    generate_quiz,
    generate_with_retry,
    get_ai_analysis,
    grade_submission,
    interview_report,
    interview_turn,
)

env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

api_key = os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=api_key) if api_key else None

CV_MODEL = "gemini-2.5-flash"

origins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global Error: {exc}")
    return JSONResponse(
        status_code=500,
        content={"message": "Internal Server Error", "details": str(exc)},
    )


class ExtractionRequest(BaseModel):
    description: str


class QuizRequest(BaseModel):
    skill: str
    level: str


class ProjectSubmission(BaseModel):
    task_title: str
    requirements: str
    user_input: str


class UserPreferences(BaseModel):
    experienceLevel: str
    learningStyle: str
    hoursPerWeek: int
    timeline: str = "Standard"


class AnalysisRequest(BaseModel):
    role_name: str
    user_skills: Dict[str, int]
    preferences: Optional[UserPreferences] = None


class ChatRequest(BaseModel):
    history: List[Dict[str, str]]
    user_input: str
    role: str
    company: str


class InterviewMessage(BaseModel):
    role: str
    content: str


class InterviewNextRequest(BaseModel):
    history: List[InterviewMessage]
    last_user_answer: str
    role: str
    company: str = ""
    jd_context: str = ""


class InterviewFinalizeRequest(BaseModel):
    history: List[InterviewMessage]
    role: str


def map_1_10_to_1_5(x: int) -> int:
    x = max(1, min(10, int(x)))
    return 1 + (x - 1) * 4 // 9


@app.get("/")
def health_check():
    return {"status": "ok", "message": "CareerArchitect API is running"}


@app.post("/api/v1/extract-skills")
def extract_skills_endpoint(request: ExtractionRequest):
    logger.info("received extraction request")
    try:
        skills = extract_skills_from_jd(request.description)
        return {"skills": skills}
    except Exception as e:
        logger.error(f"Extraction failed: {e}")
        error_msg = str(e)
        if "429" in error_msg or "RESOURCE_EXHAUSTED" in error_msg:
            raise HTTPException(
                status_code=429,
                detail="AI Traffic High. Please wait 10 seconds and try again.",
            )
        raise HTTPException(status_code=500, detail="AI Service Unavailable")


@app.post("/api/v1/scan-cv")
def scan_cv_endpoint(file: UploadFile = File(...)):
    try:
        content = file.file.read()
        text = ""

        try:
            with pdfplumber.open(io.BytesIO(content)) as pdf:
                for page in pdf.pages:
                    text += (page.extract_text() or "") + "\n"
        except Exception as pdf_err:
            logger.error(f"PDF Parsing Error: {pdf_err}")
            return {}

        if len(text) < 50:
            return {}
        if not client:
            return {}

        prompt = f"""
        ROLE: Technical Recruiter.
        TASK: Extract technical skills and estimate proficiency (1-10) based on experience.
        OUTPUT: JSON Object {{ "SkillName": Score }}
        RESUME TEXT: {text[:15000]}
        """

        try:
            response = generate_with_retry(
                model=CV_MODEL,
                prompt=prompt,
                config=types.GenerateContentConfig(response_mime_type="application/json"),
            )

            cleaned_text = clean_json_text(response.text)
            data = json.loads(cleaned_text)

            mapped: Dict[str, int] = {}
            if isinstance(data, dict):
                for k, v in data.items():
                    if isinstance(v, (int, float)):
                        mapped[k] = map_1_10_to_1_5(int(v))
                    elif isinstance(v, str) and v.isdigit():
                        mapped[k] = map_1_10_to_1_5(int(v))

            return mapped

        except Exception as e:
            logger.error(f"CV Scan Model Failed: {e}")
            return {}

    except Exception as e:
        logger.error(f"CV Scan Endpoint Failed: {e}")
        return {}


@app.post("/api/v1/analyze")
def analyse_skills(request: AnalysisRequest):
    logger.info(f"Architecting roadmap for {request.role_name}")
    try:
        prefs = request.preferences or UserPreferences(
            experienceLevel="Mid",
            learningStyle="Visual",
            hoursPerWeek=10,
            timeline="Standard",
        )

        target_level = 5
        gaps: List[Dict[str, Any]] = []

        for skill, current_level in request.user_skills.items():
            current_level_int = int(current_level)
            current_level_int = max(1, min(5, current_level_int))
            if current_level_int < target_level:
                meta = get_ai_analysis(request.role_name, skill, current_level_int, target_level)
                gaps.append(
                    {
                        "skill_name": skill,
                        "current_level": current_level_int,
                        "target_level": target_level,
                        "priority": meta["priority"],
                        "estimated_hours": meta["estimated_hours"],
                    }
                )

        roadmap = generate_dynamic_roadmap(gaps, prefs)

        total_score = sum(max(1, min(5, int(v))) for v in request.user_skills.values())
        max_possible = len(request.user_skills) * 5
        match_percentage = int((total_score / max_possible) * 100) if max_possible > 0 else 0

        return {
            "role_name": request.role_name,
            "match_percentage": match_percentage,
            "roadmap": roadmap,
            "missing_skills": gaps,
        }

    except Exception as e:
        logger.error(f"Analysis Failed: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/grade-project")
async def grade_project(submission: ProjectSubmission):
    try:
        return grade_submission(submission.task_title, submission.requirements, submission.user_input)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/quiz")
async def quiz(req: QuizRequest):
    try:
        return generate_quiz(req.skill, req.level)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/interview/next")
async def interview_next(req: InterviewNextRequest):
    try:
        # history schema here is InterviewMessage, convert to dicts expected by interview_turn
        history_dicts = [{"role": m.role, "content": m.content} for m in req.history]
        return interview_turn(history_dicts, req.last_user_answer, req.role, req.company, req.jd_context)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/interview/finalize")
async def interview_finalize(req: InterviewFinalizeRequest):
    try:
        history_dicts = [{"role": m.role, "content": m.content} for m in req.history]
        return interview_report(history_dicts, req.role)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/interview/chat")
def interview_chat_endpoint(request: ChatRequest):
    try:
        response = generate_interview_response(
            request.history,
            request.user_input,
            request.role,
            request.company,
        )
        return response
    except Exception as e:
        logger.error(f"Chat Error: {e}")
        raise HTTPException(status_code=500, detail="AI Interviewer is offline")

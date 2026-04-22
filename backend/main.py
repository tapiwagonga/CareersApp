import logging
import traceback
from typing import Any, Dict, List, Optional
from fastapi.exceptions import RequestValidationError
from fastapi import FastAPI, File, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from backend.core import (
    ask_about_notes,
    explain_notes,
    extract_skills_from_jd,
    generate_dynamic_roadmap,
    generate_interview_response,
    generate_quiz,
    get_ai_analysis,
    grade_submission,
    interview_report,
    interview_turn,
    scan_cv_and_extract_skills,
    summarise_notes,
    calculate_skill_gaps,
    UpstreamAIUnavailable,
)

logger = logging.getLogger(__name__)

app = FastAPI()

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
    experienceLevel: str = "Mid"
    learningStyle: str = "Visual"
    hoursPerWeek: int = 10
    timeline: str = "Standard"

class SkillRequirement(BaseModel):
    skill: str
    category: Optional[str] = None
    importance: str = "Bonus"
    evidence: Optional[str] = None
    context: Optional[str] = None
    target_level: int = 5

class AnalysisRequest(BaseModel):
    role_name: str
    user_skills: Dict[str, int]
    required_skills: List[SkillRequirement]
    preferences: Optional[UserPreferences] = None

class InterviewMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    history: List[Dict[str, str]]
    user_input: str
    role: str
    company: str

class InterviewNextRequest(BaseModel):
    history: List[InterviewMessage]
    last_user_answer: str
    role: str
    company: str = ""
    jd_context: str = ""

class InterviewFinalizeRequest(BaseModel):
    history: List[InterviewMessage]
    role: str

class NotesRequest(BaseModel):
    notes: str

class AskNotesRequest(BaseModel):
    notes: str
    question: str

@app.get("/")
def health_check():
    return {"status": "ok", "message": "CareerArchitect API is running"}

@app.post("/api/v1/extract-skills")
def extract_skills_endpoint(request: ExtractionRequest):
    logger.info("received extraction request")
    try:
        skills = extract_skills_from_jd(request.description)
        if not skills:
            raise HTTPException(status_code=502, detail="No skills could be extracted from the job description.")
        return {"skills": skills}
    except UpstreamAIUnavailable as e:
        logger.error(f"Extraction upstream unavailable: {e}")
        raise HTTPException(
            status_code=503,
            detail="Gemini is temporarily overloaded. Please retry in a few seconds."
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Extraction failed: {e}")
        raise HTTPException(status_code=500, detail="AI Service Unavailable")

@app.post("/api/v1/scan-cv")
async def scan_cv_endpoint(file: UploadFile = File(...)):
    try:
        content = await file.read()
        mapped_skills = scan_cv_and_extract_skills(content)
        return mapped_skills
    except UpstreamAIUnavailable as e:
        logger.error(f"CV scan upstream unavailable: {e}")
        raise HTTPException(
            status_code=503,
            detail="Gemini is temporarily overloaded. Please retry CV scanning in a few seconds."
        )
    except Exception as e:
        logger.error(f"CV Scan Endpoint Failed: {e}")
        raise HTTPException(status_code=500, detail="CV scan failed")


@app.post("/api/v1/analyze")
def analyse_skills_endpoint(request: AnalysisRequest):
    logger.info(f"Architecting roadmap for {request.role_name}")

    try:
        prefs = request.preferences or UserPreferences()

        gaps: List[Dict[str, Any]] = []
        total_score = 0
        max_possible = 0

        for req in request.required_skills:
            skill_name = req.skill
            target_level = int(req.target_level or 5)

            current_level = request.user_skills.get(skill_name, 0)
            current_level_int = max(0, min(5, int(current_level)))

            max_possible += target_level
            total_score += current_level_int

            if current_level_int < target_level:
                meta = get_ai_analysis(
                    request.role_name,
                    skill_name,
                    current_level_int,
                    target_level
                )

                gaps.append({
                    "skill_name": skill_name,
                    "current_level": current_level_int,
                    "target_level": target_level,
                    "priority": meta["priority"],
                    "estimated_hours": meta["estimated_hours"],
                    "resources": meta.get("resources", [])
                })

        roadmap = generate_dynamic_roadmap(gaps, prefs)
        match_percentage = int((total_score / max_possible) * 100) if max_possible > 0 else 0
        total_hours_required = sum(item["estimated_hours"] for item in gaps)

        return {
            "role_name": request.role_name,
            "match_percentage": match_percentage,
            "roadmap": roadmap,
            "missing_skills": gaps,
            "summary": {
                "total_hours_required": total_hours_required,
                "weekly_commitment": prefs.hoursPerWeek,
                "estimated_completion_weeks": max(
                    1,
                    round(total_hours_required / max(1, prefs.hoursPerWeek))
                )
            }
        }

    except Exception as e:
        logger.error(f"Analysis Failed\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/grade-project")
async def grade_project_endpoint(submission: ProjectSubmission):
    try:
        return grade_submission(submission.task_title, submission.requirements, submission.user_input)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/quiz")
async def quiz_endpoint(req: QuizRequest):
    try:
        return generate_quiz(req.skill, req.level)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/interview/next")
async def interview_next_endpoint(req: InterviewNextRequest):
    try:
        history_dicts = [{"role": m.role, "content": m.content} for m in req.history]
        return interview_turn(history_dicts, req.last_user_answer, req.role, req.company, req.jd_context)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/interview/finalize")
async def interview_finalize_endpoint(req: InterviewFinalizeRequest):
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

@app.post("/api/v1/notes/explain")
def explain_notes_endpoint(request: NotesRequest):
    try:
        return explain_notes(request.notes)
    except Exception as e:
        logger.error(f"Notes explain error: {e}")
        raise HTTPException(status_code=500, detail="Could not process notes")

@app.post("/api/v1/notes/summarise")
def summarise_notes_endpoint(request: NotesRequest):
    try:
        return summarise_notes(request.notes)
    except Exception as e:
        logger.error(f"Notes summarise error: {e}")
        raise HTTPException(status_code=500, detail="Could not process notes")

@app.post("/api/v1/notes/ask")
def ask_notes_endpoint(request: AskNotesRequest):
    try:
        return ask_about_notes(request.notes, request.question)
    except Exception as e:
        logger.error(f"Notes ask error: {e}")
        raise HTTPException(status_code=500, detail="Could not process query")

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={
            "message": "Request validation failed",
            "errors": exc.errors(),
            "body": exc.body
        }
    )
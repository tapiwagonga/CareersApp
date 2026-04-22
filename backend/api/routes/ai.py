from fastapi import APIRouter, File, UploadFile
from pydantic import BaseModel
from typing import Any, Dict, List, Optional

from backend.services.ai.quiz_service import generate_quiz
from backend.services.ai.grading_service import grade_submission
from backend.services.ai.interview_service import (
    generate_interview_response,
    interview_turn,
    interview_report
)
from backend.services.ai.notes_service import (
    explain_notes,
    summarise_notes,
    ask_about_notes
)
from backend.services.cv.cv_service import scan_cv_and_extract_skills

router = APIRouter()


# -----------------------------
# Request Models
# -----------------------------

class QuizRequest(BaseModel):
    skill: str
    level: str


class GradeRequest(BaseModel):
    title: str
    requirements: str
    user_input: str


class InterviewChatRequest(BaseModel):
    history: List[Any]
    user_input: str
    role: str
    company: str


class InterviewTurnRequest(BaseModel):
    history: List[Any]
    user_input: str
    role: str
    company: str


class InterviewReportRequest(BaseModel):
    history: List[Any]
    role: str


class NotesRequest(BaseModel):
    notes: str


class NotesAskRequest(BaseModel):
    notes: str
    question: str


# -----------------------------
# Endpoints
# -----------------------------

class QuizRequest(BaseModel):
    skill: str
    level: str


class NotesRequest(BaseModel):
    notes: str


class AskNotesRequest(BaseModel):
    notes: str
    question: str


class InterviewTurnRequest(BaseModel):
    history: List[Dict[str, Any]]
    user_input: str
    role: str
    company: str
    context: str = ""


class InterviewReportRequest(BaseModel):
    history: List[Dict[str, Any]]
    role: str


class RoadmapRequest(BaseModel):
    gaps: List[Dict[str, Any]]
    preferences: Dict[str, Any]


# ----------------------
# Utility
# ----------------------

def map_1_10_to_1_5(x: int) -> int:
    return max(1, min(5, round(x / 2)))


# ----------------------
# Endpoints
# ----------------------

# Quiz
@router.post("/quiz")
def create_quiz(req: QuizRequest):
    return {
        "quiz": generate_quiz(req.skill, req.level)
    }


# CV Scan
@router.post("/cv/scan")
async def scan_cv(file: UploadFile = File(...)):
    file_bytes = await file.read()

    result = scan_cv_and_extract_skills(
        file_bytes=file_bytes,
        client=client,
        generate_with_retry=generate_with_retry,
        clean_json_text=clean_json_text,
        map_1_10_to_1_5=map_1_10_to_1_5
    )

    return {
        "skills": result
    }


# Explain Notes
@router.post("/notes/explain")
def explain(req: NotesRequest):
    return explain_notes(req.notes)


# Summarise Notes
@router.post("/notes/summarise")
def summarise(req: NotesRequest):
    return summarise_notes(req.notes)


# Ask About Notes
@router.post("/notes/ask")
def ask(req: AskNotesRequest):
    return ask_about_notes(req.notes, req.question)


# Interview Turn
@router.post("/interview/turn")
def interview(req: InterviewTurnRequest):
    return interview_turn(
        history=req.history,
        user_input=req.user_input,
        role=req.role,
        company=req.company,
        context=req.context
    )


# Interview Report
@router.post("/interview/report")
def report(req: InterviewReportRequest):
    return interview_report(req.history, req.role)


# Generate Roadmap
@router.post("/roadmap")
def roadmap(req: RoadmapRequest):
    prefs_obj = type("Prefs", (), req.preferences)

    return {
        "roadmap": generate_dynamic_roadmap(
            gaps=req.gaps,
            prefs=prefs_obj
        )
    }


# Extract Skills from Job Description
@router.post("/jd/skills")
def extract_skills(description: str = Body(...)):
    return {
        "skills": extract_skills_from_jd(description)
    }
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from backend.services.ai.analysis_service import extract_skills_from_jd
from backend.services.roadmap.roadmap_service import generate_dynamic_roadmap

router = APIRouter()

class ExtractionRequest(BaseModel):
    description: str


@router.post("/extract-skills")
def extract_skills(req: ExtractionRequest):
    try:
        return {
            "skills": extract_skills_from_jd(req.description)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
from fastapi import APIRouter
from typing import Dict

router = APIRouter()

@router.post("/ai/explain")
def explain(data: Dict[str, str]):
    return explain_notes(data.get("notes", ""))

@router.post("/ai/summarise")
def summarise(data: Dict[str, str]):
    return summarise_notes(data.get("notes", ""))

@router.post("/ai/ask")
def ask(data: Dict[str, str]):
    return ask_about_notes(
        data.get("notes", ""),
        data.get("question", "")
    )
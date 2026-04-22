import json
import logging
from typing import List, Dict, Any

from google.genai import types
from core.shared import client, MODEL_FAST, generate_with_retry, clean_json_text

logger = logging.getLogger(__name__)


def interview_turn(history: List[Dict[str, Any]], user_input: str, role: str, company: str, context: str = "") -> Dict[str, Any]:
    if not client:
        return {"text": "AI Offline", "evaluation": "N/A"}

    history_text = "\n".join(
        [f"{m.get('role', 'unknown')}: {m.get('content', '')}" for m in history[-6:]]
    )

    prompt = f"""
    ACT AS hiring manager at {company} interviewing for {role}
    Context {context}

    History
    {history_text}

    Candidate said {user_input}

    Task
    1 Evaluate briefly
    2 Respond naturally under 50 words
    3 Ask a relevant follow up

    OUTPUT JSON
    {{
        "evaluation": "short assessment",
        "text": "spoken response"
    }}
    """

    try:
        response = generate_with_retry(
            MODEL_FAST,
            prompt,
            types.GenerateContentConfig(response_mime_type="application/json"),
        )
        data = json.loads(clean_json_text(response.text))

        return {
            "text": str(data.get("text", "Let us continue")),
            "evaluation": str(data.get("evaluation", "OK")),
        }

    except Exception as e:
        logger.error(f"interview_turn error {e}")
        return {"text": "Let us continue", "evaluation": "error"}


def interview_report(history: List[Dict[str, Any]], role: str) -> Dict[str, Any]:
    if not client:
        return {
            "overall_score": 0,
            "decision": "ERROR",
            "summary": "AI offline",
            "strengths": [],
            "weaknesses": [],
        }

    transcript = "\n".join(
        [f"{m.get('role', 'unknown')}: {m.get('content', '')}" for m in history]
    )

    prompt = f"""
    ACT AS interview bar raiser for {role}

    Transcript
    {transcript[:30000]}

    OUTPUT JSON
    {{
        "overall_score": 0,
        "decision": "HIRE",
        "summary": "",
        "strengths": [],
        "weaknesses": []
    }}
    """

    try:
        response = generate_with_retry(
            MODEL_FAST,
            prompt,
            types.GenerateContentConfig(response_mime_type="application/json"),
        )

        data = json.loads(clean_json_text(response.text))

        return {
            "overall_score": int(data.get("overall_score", 0) or 0),
            "decision": str(data.get("decision", "ERROR")),
            "summary": str(data.get("summary", "")),
            "strengths": data.get("strengths", []),
            "weaknesses": data.get("weaknesses", []),
        }

    except Exception as e:
        logger.error(f"interview_report error {e}")
        return {
            "overall_score": 0,
            "decision": "ERROR",
            "summary": "failed",
            "strengths": [],
            "weaknesses": [],
        }
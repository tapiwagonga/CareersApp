import json
from backend.services.ai.base_ai_service import BaseAIService

ai = BaseAIService()


def generate_interview_response(history, user_input, role, company):
    prompt = f"""
    You are an expert interviewer for {role} at {company}

    Candidate input: {user_input}

    History:
    {json.dumps(history[-3:] if history else [])}

    OUTPUT JSON:
    {{
        "text": "...",
        "evaluation": "..."
    }}
    """

    try:
        data = ai.generate_json(prompt)
        return {
            "text": data.get("text", ""),
            "evaluation": data.get("evaluation", "")
        }
    except Exception:
        return {"text": "Could you expand on that?", "evaluation": "fallback"}

def interview_turn(history, user_input, role, company, context=""):

    prompt = f"""
    ACT AS: Hiring manager at {company} interviewing for {role}

    CONTEXT: {context}

    HISTORY:
    {history[-6:]}

    CANDIDATE: {user_input}

    OUTPUT JSON:
    {{
        "evaluation": "max 10 words",
        "text": "spoken response under 50 words"
    }}
    """

    try:
        data = BaseAIService().generate_json(prompt)
        return {
            "text": data.get("text", ""),
            "evaluation": data.get("evaluation", "")
        }
    except Exception:
        return {"text": "Next question.", "evaluation": "error"}

def interview_report(history, role):

    transcript = "\n".join(
        [f"{m.get('role')}: {m.get('content')}" for m in history]
    )

    prompt = f"""
    ACT AS: Interview bar raiser

    ROLE: {role}

    TRANSCRIPT:
    {transcript[:30000]}

    OUTPUT JSON:
    {{
        "overall_score": 85,
        "decision": "HIRE",
        "summary": "",
        "strengths": [],
        "weaknesses": []
    }}
    """

    try:
        data = BaseAIService().generate_json(prompt)

        return {
            "overall_score": int(data.get("overall_score", 0)),
            "decision": data.get("decision", "ERROR"),
            "summary": data.get("summary", ""),
            "strengths": data.get("strengths", []),
            "weaknesses": data.get("weaknesses", [])
        }

    except Exception:
        return {
            "overall_score": 0,
            "decision": "ERROR",
            "summary": "Failed",
            "strengths": [],
            "weaknesses": []
        }
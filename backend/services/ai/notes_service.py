from backend.services.ai.base_ai_service import BaseAIService

ai = BaseAIService()


def explain_notes(notes: str):

    prompt = f"""
    Explain clearly:

    {notes[:12000]}

    OUTPUT JSON:
    {{
        "explanation": "",
        "key_points": [],
        "gaps": []
    }}
    """

    try:
        return ai.generate_json(prompt)
    except Exception:
        return {"explanation": "failed"}


def summarise_notes(notes: str):

    prompt = f"""
    Summarise:

    {notes[:12000]}

    OUTPUT JSON:
    {{
        "summary": "",
        "bullets": []
    }}
    """

    try:
        return ai.generate_json(prompt)
    except Exception:
        return {"summary": "failed"}


def ask_about_notes(notes: str, question: str):

    prompt = f"""
    NOTES:
    {notes[:10000]}

    QUESTION:
    {question}

    OUTPUT JSON:
    {{
        "answer": "",
        "confidence": "high"
    }}
    """

    try:
        return ai.generate_json(prompt)
    except Exception:
        return {"answer": "failed"}
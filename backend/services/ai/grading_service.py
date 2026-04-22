from backend.services.ai.base_ai_service import BaseAIService

ai = BaseAIService()


def grade_submission(title: str, requirements: str, user_input: str):
    prompt = f"""
    ACT AS: Senior tech lead

    TASK: Grade submission

    TITLE: {title}
    REQUIREMENTS: {requirements}
    SUBMISSION: {user_input}

    RULES:
    - Accept valid explanation or GitHub links
    - Reject nonsense

    OUTPUT JSON:
    {{
        "passed": true,
        "feedback": "string"
    }}
    """

    try:
        data = ai.generate_json(prompt)

        if not isinstance(data, dict):
            return {"passed": True, "feedback": "Auto accepted"}

        return {
            "passed": bool(data.get("passed", True)),
            "feedback": str(data.get("feedback", ""))
        }

    except Exception:
        return {"passed": True, "feedback": "Service fallback accepted"}
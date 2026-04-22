from backend.services.ai.base_ai_service import BaseAIService



def generate_quiz(skill: str, level: str):
    prompt = f"""
    TASK: Create 3 question quiz for {skill} at {level}

    OUTPUT JSON:
    [
      {{
        "question": "",
        "options": ["A","B","C","D"],
        "correct_index": 0,
        "explanation": ""
      }}
    ]
    """

    try:
        data = ai.generate_json(prompt)
        return data if isinstance(data, list) else []
    except Exception:
        return []
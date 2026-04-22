import json
from functools import lru_cache

from backend.utils.text_utils import clean_json_text
from backend.services.ai.base_ai_service import BaseAIService

ai = BaseAIService()


@lru_cache(maxsize=50)
def extract_skills_from_jd(description: str):
    prompt = f"""
    ROLE: Technical recruiter
    TASK: Extract technical skills

    OUTPUT:
    {{
      "skills": [
        {{
          "skill": "React",
          "category": "Framework",
          "importance": "Critical"
        }}
      ]
    }}

    INPUT:
    {description[:20000]}
    """

    try:
        response = ai.generate_json(prompt)
        data = json.loads(clean_json_text(response.text))

        if isinstance(data, dict):
            return data.get("skills", [])

        return []
    except Exception:
        return []
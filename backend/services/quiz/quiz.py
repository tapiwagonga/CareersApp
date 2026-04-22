import json
import logging
from typing import List, Dict, Any

from google.genai import types
from core.shared import client, MODEL_FAST, generate_with_retry, clean_json_text

logger = logging.getLogger(__name__)


def generate_quiz(skill: str, level: str) -> List[Dict[str, Any]]:
    if not client:
        return []

    prompt = f"""
    Create quiz for {skill} at {level}

    OUTPUT JSON ARRAY
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
        response = generate_with_retry(
            MODEL_FAST,
            prompt,
            types.GenerateContentConfig(response_mime_type="application/json"),
        )

        data = json.loads(clean_json_text(response.text))
        return data if isinstance(data, list) else []

    except Exception as e:
        logger.error(f"quiz error {e}")
        return []
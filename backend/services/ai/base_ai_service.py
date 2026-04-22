import json
import random
import time

from google.genai import types
from backend.core.shared import generate_with_retry
from backend.utils.text_utils import clean_json_text


MODEL_FAST = "gemini-2.5-flash"


class BaseAIService:

    def generate_json(self, prompt: str):
        response = generate_with_retry(
            model=MODEL_FAST,
            prompt=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json"
            ),
        )
        return json.loads(clean_json_text(response.text))

    def generate_text(self, prompt: str):
        response = generate_with_retry(
            model=MODEL_FAST,
            prompt=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="text/plain"
            ),
        )
        return response.text
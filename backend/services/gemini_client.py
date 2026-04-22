import random
import time
from google import genai
from google.genai import types

from app.core.config import settings

client = genai.Client(api_key=settings.GEMINI_API_KEY) if settings.GEMINI_API_KEY else None


def generate_with_retry(model: str, prompt: str, config: types.GenerateContentConfig, retries: int = 3):
    if not client:
        raise RuntimeError("Gemini client not initialised")

    for i in range(retries):
        try:
            return client.models.generate_content(
                model=model,
                contents=prompt,
                config=config
            )
        except Exception as e:
            msg = str(e)
            retryable = ("429" in msg) or ("RESOURCE_EXHAUSTED" in msg) or ("503" in msg)

            if not retryable or i == retries - 1:
                raise

            sleep_time = (2 ** i) + random.uniform(0.3, 1.2)
            time.sleep(sleep_time)
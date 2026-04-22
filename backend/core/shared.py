import os
import time
import random
import json
import logging
from typing import Optional

from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

logger = logging.getLogger(__name__)

MODEL_FAST = "gemini-2.5-flash"


api_key = os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=api_key) if api_key else None

if not client:
    logger.critical("GEMINI_API_KEY missing, AI features disabled")


def generate_with_retry(model: str, prompt: str, config: types.GenerateContentConfig, retries: int = 3):
    if not client:
        raise RuntimeError("Gemini client not initialised")

    last_error = None

    for i in range(retries):
        try:
            return client.models.generate_content(
                model=model,
                contents=prompt,
                config=config
            )

        except Exception as e:
            last_error = e
            msg = str(e)

            retryable = (
                "429" in msg
                or "RESOURCE_EXHAUSTED" in msg
                or "503" in msg
                or "timeout" in msg.lower()
            )

            if not retryable:
                raise

            if i == retries - 1:
                break

            sleep_time = (2 ** i) + random.uniform(0.3, 1.2)
            time.sleep(sleep_time)

    raise RuntimeError(f"Gemini failed after retries: {last_error}")


def clean_json_text(text: str) -> str:
    if not text:
        return "{}"

    cleaned = text.strip()

    if "```" in cleaned:
        parts = cleaned.split("```")
        if len(parts) >= 3:
            block = parts[1].strip()
            if block.startswith("json"):
                block = block[4:].strip()
            cleaned = block

    if not (cleaned.startswith("{") or cleaned.startswith("[")):
        import re
        match = re.search(r"(\{.*\}|\[.*\])", cleaned, re.DOTALL)
        if match:
            cleaned = match.group(0)

    return cleaned
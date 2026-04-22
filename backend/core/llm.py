from google.genai import types
from .utils import generate_with_retry
from .config import MODEL_FAST

def llm_json(client, prompt: str):
    response = generate_with_retry(
        client=client,
        model=MODEL_FAST,
        prompt=prompt,
        config=types.GenerateContentConfig(response_mime_type="application/json"),
    )
    return response
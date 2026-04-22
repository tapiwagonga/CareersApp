import re
import time
import random

def clean_json_text(text: str) -> str:
    if not text:
        return "{}"

    text = text.strip()

    if "```" in text:
        parts = text.split("```")
        if len(parts) >= 3:
            text = parts[1].replace("json", "").strip()

    match = re.search(r"(\{.*\}|\[.*\])", text, re.DOTALL)
    return match.group(0) if match else text


def generate_with_retry(client, model, prompt, config, retries=3):
    for i in range(retries):
        try:
            return client.models.generate_content(
                model=model,
                contents=prompt,
                config=config
            )
        except Exception:
            if i == retries - 1:
                raise
            time.sleep(2 ** i + random.uniform(0.2, 1))


def map_1_10_to_1_5(x: int) -> int:
    return max(1, min(5, round(x / 2)))
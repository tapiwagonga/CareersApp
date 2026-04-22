import re

def clean_json_text(text: str) -> str:
    if not text:
        return "{}"

    cleaned = text.strip()

    if "```" in cleaned:
        parts = cleaned.split("```")
        if len(parts) >= 3:
            content = parts[1]
            if content.startswith("json"):
                content = content[4:]
            cleaned = content.strip()

    if not (cleaned.startswith("{") or cleaned.startswith("[")):
        match = re.search(r"(\[.*\]|\{.*\})", text, re.DOTALL)
        if match:
            cleaned = match.group(0)

    return cleaned
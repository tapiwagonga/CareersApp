import io
import json
import logging
from typing import Dict, Any

import pdfplumber
from google.genai import types

from backend.core.shared import (
    client,
    MODEL_FAST,
    generate_with_retry,
    clean_json_text,
)

logger = logging.getLogger(__name__)


CV_MODEL = MODEL_FAST


def scan_cv_and_extract_skills(file_bytes: bytes, map_1_10_to_1_5) -> Dict[str, int]:
    try:
        text = ""

        try:
            with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
                for page in pdf.pages:
                    text += (page.extract_text() or "") + "\n"
        except Exception as e:
            logger.error(f"pdf parse failed {e}")
            return {}

        if len(text) < 50 or not client:
            return {}

        prompt = f"""
        Extract skills with scores 1 to 10

        Resume
        {text[:15000]}

        OUTPUT JSON
        {{
            "Skill": 7
        }}
        """

        response = generate_with_retry(
            CV_MODEL,
            prompt,
            types.GenerateContentConfig(response_mime_type="application/json"),
        )

        data = json.loads(clean_json_text(response.text))

        mapped = {}

        if isinstance(data, dict):
            for k, v in data.items():
                if isinstance(v, (int, float)):
                    mapped[k] = map_1_10_to_1_5(int(v))
                elif isinstance(v, str) and v.isdigit():
                    mapped[k] = map_1_10_to_1_5(int(v))

        return mapped

    except Exception as e:
        logger.error(f"cv scan failed {e}")
        return {}
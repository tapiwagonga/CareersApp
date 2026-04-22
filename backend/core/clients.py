import logging
from typing import Optional
from google import genai
from supabase import create_client, Client
from .config import GEMINI_API_KEY, SUPABASE_URL, SUPABASE_KEY

logger = logging.getLogger(__name__)

client: Optional[genai.Client] = genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None

if not client:
    logger.critical("GEMINI_API_KEY missing, AI features disabled")

supabase_client: Optional[Client] = (
    create_client(SUPABASE_URL, SUPABASE_KEY)
    if SUPABASE_URL and SUPABASE_KEY
    else None
)
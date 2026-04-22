from typing import List, Dict, Any, Optional

from app.core.config import settings
from supabase import create_client


class SupabaseResourceRepo:

    def __init__(self):
        self.client = None
        if settings.SUPABASE_URL and settings.SUPABASE_KEY:
            self.client = create_client(
                settings.SUPABASE_URL,
                settings.SUPABASE_KEY
            )

    def get_resources(self, skill: str, limit: int = 15) -> List[Dict[str, Any]]:
        if not self.client:
            return []

        res = (
            self.client.table("resources")
            .select("*")
            .eq("skill_name", skill.lower())
            .order("quality_score", desc=True)
            .limit(limit)
            .execute()
        )

        return res.data or []

    def upsert_resources(self, records: List[Dict[str, Any]]):
        if not self.client or not records:
            return

        self.client.table("resources").upsert(
            records,
            on_conflict="url"
        ).execute()
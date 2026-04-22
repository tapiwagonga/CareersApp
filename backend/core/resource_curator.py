import json
import time
import uuid
import random
import logging
from typing import Any, Dict, List, Optional
from urllib.parse import urlparse

from duckduckgo_search import DDGS

from core import client, supabase_client, MODEL_FAST
from utils import generate_with_retry, clean_json_text

logger = logging.getLogger(__name__)


class ResourceCurator:

    BLOCKLIST = (
        "geeksforgeeks", "w3schools", "tutorialspoint", "javatpoint",
        "quora", "chegg", "brainly", "scribd", "slideshare",
        "medium.com", "dev.to", "hashnode"
    )

    TYPE_MAP = {
        "doc": ["docs.python.org", "developer.mozilla.org", "react.dev"],
        "deep_dive": ["martinfowler.com", "aws.amazon.com"],
        "video": ["youtube.com", "youtu.be"],
        "repo": ["github.com"],
        "book": ["amazon.com", "oreilly.com"]
    }

    @staticmethod
    def _domain(url: str) -> str:
        try:
            d = urlparse(url).netloc.lower()
            return d[4:] if d.startswith("www.") else d
        except:
            return ""

    @staticmethod
    def _search(query: str, video=False):
        with DDGS() as ddgs:
            if video:
                return list(ddgs.videos(query, max_results=6))
            return list(ddgs.text(query, max_results=6))

    @staticmethod
    def _pick_best(res_type: str, query: str):
        results = ResourceCurator._search(query, video=(res_type == "video"))

        best_url = None
        best_score = 0

        for r in results:
            url = r.get("href") or r.get("content")
            if not url:
                continue

            score = 50

            if any(b in url for b in ResourceCurator.BLOCKLIST):
                score -= 20

            if score > best_score:
                best_score = score
                best_url = url

        if not best_url:
            return None

        return {
            "url": best_url,
            "quality_score": best_score,
            "provider": ResourceCurator._domain(best_url)
        }

    @staticmethod
    def curate_from_ai(skill: str, level: str, style: str, target=8):

        if not client:
            return []

        prompt = f"""
        Create learning resources for {skill}.
        Level: {level}
        Style: {style}

        Return JSON list:
        type, title, description, search_query, estimated_minutes
        """

        response = generate_with_retry(
            client,
            MODEL_FAST,
            prompt,
            None
        )

        data = json.loads(clean_json_text(response.text))

        results = []

        for item in data:
            best = ResourceCurator._pick_best(item.get("type", "doc"), item.get("search_query", skill))

            if not best:
                continue

            results.append({
                "type": item.get("type", "doc"),
                "title": item.get("title", ""),
                "description": item.get("description", ""),
                "estimated_minutes": item.get("estimated_minutes", 30),
                "meta": best
            })

        if supabase_client:
            try:
                supabase_client.table("resources").upsert(results, on_conflict="url").execute()
            except:
                pass

        return results

    @staticmethod
    def curate_from_db(skill: str, limit=8):
        if not supabase_client:
            return []

        res = supabase_client.table("resources").select("*").eq("skill_name", skill.lower()).execute()

        if not res.data:
            return []

        return res.data[:limit]
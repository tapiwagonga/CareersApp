import random
from typing import List, Dict, Any

from app.services.resources.search_service import SearchService
from app.services.resources.supabase_repo import SupabaseResourceRepo


class ResourceCuratorService:

    BLOCKLIST = {
        "geeksforgeeks", "w3schools", "tutorialspoint",
        "quora", "medium.com", "dev.to"
    }

    def __init__(self):
        self.repo = SupabaseResourceRepo()

    def curate_from_db(self, skill: str, limit: int = 10):
        return self.repo.get_resources(skill, limit)

    def _is_bad(self, url: str) -> bool:
        return any(b in url for b in self.BLOCKLIST)

    def _pick_best(res_type, query):
    results = _search(query, video=(res_type == "video"))

    best = None
    best_score = 0

    for r in results:
        url = r.get("href") or r.get("content")
        if not url:
            continue

        score = 50  # keep simple, no overengineering

        if score > best_score:
            best_score = score
            best = url

    if not best:
        return None

    return {"url": best, "quality_score": best_score}

    def fallback(self, skill: str):
        return [
            {
                "type": "doc",
                "title": f"{skill} documentation",
                "description": "Official reference material",
                "meta": {"url": "https://google.com", "platform": "Web"}
            },
            {
                "type": "video",
                "title": f"{skill} tutorial",
                "description": "Video explanation",
                "meta": {"url": "https://youtube.com", "platform": "YouTube"}
            }
        ]

    def curate(self, skill: str, target: int = 8):

        db_items = self.curate_from_db(skill, target)
        if len(db_items) >= 3:
            return db_items

        results = []

        for t in ["doc", "deep", "video", "repo"]:
            picked = self.pick_best(f"{skill} {t}", t)
            if not picked:
                continue

            results.append({
                "type": t,
                "title": picked["title"],
                "description": f"Learn {skill} via {t}",
                "meta": {
                    "url": picked["url"],
                    "platform": "Web",
                    "quality_score": picked["score"]
                }
            })

        if len(results) < 3:
            results += self.fallback(skill)

        self.repo.upsert_resources([
            {
                "skill_name": skill.lower(),
                "type": r["type"],
                "title": r["title"],
                "description": r["description"],
                "url": r["meta"]["url"],
                "platform": r["meta"].get("platform", "Web"),
                "provider": "auto",
                "estimated_minutes": 30,
                "quality_score": r["meta"].get("quality_score", 50),
                "iframe_safe": True
            }
            for r in results
        ])

        return results[:target]
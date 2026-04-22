import datetime
import concurrent.futures
from typing import List, Dict, Any

from app.services.resources.curator_service import ResourceCuratorService


curator = ResourceCuratorService()


def process_gap(gap: Dict[str, Any]):
    skill = gap.get("skill_name")

    resources = curator.curate(skill, 6)

    return {
        "skill_name": skill,
        "gap_hours": float(gap.get("estimated_hours", 5)),
        "resources": resources
    }


def generate_dynamic_roadmap(gaps: List[Dict[str, Any]], hours_per_week: int = 10):

    gaps.sort(key=lambda g: g.get("priority", "Medium"))

    results = []

    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as ex:
        futures = [ex.submit(process_gap, g) for g in gaps]
        for f in concurrent.futures.as_completed(futures):
            results.append(f.result())

    roadmap = []
    current = datetime.datetime.now()

    week = 1

    for r in results:

        days = max(1, int((r["gap_hours"] / hours_per_week) * 7))
        end = current + datetime.timedelta(days=days)

        roadmap.append({
            "week_number": week,
            "label": f"Module: {r['skill_name']}",
            "focus_area": r["skill_name"],
            "tasks": r["resources"],
            "start_date": current.strftime("%b %d"),
            "end_date": end.strftime("%b %d"),
            "total_hours": r["gap_hours"]
        })

        current = end
        week += 1

    return roadmap
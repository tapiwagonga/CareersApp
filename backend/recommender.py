from typing import List, Dict
from sqlalchemy.orm import Session
from . import models


class RecommenderEngine:
    def generate_plan(self, user_skills: Dict[str, int], role_reqs: Dict[str, int]) -> Dict:
        matched = [s for s, lv in role_reqs.items() if user_skills.get(s, 0) >= lv]
        gaps = []

        for skill, req_lv in role_reqs.items():
            current_lv = user_skills.get(skill, 0)
            if current_lv < req_lv:
                gaps.append({
                    "skill": skill,
                    "target": req_lv,
                    "current": current_lv,
                    "rationale": f"Role requires {skill} at level {req_lv}; you are currently level {current_lv}."
                })
        
        return {
            "matched": matched,
            "plan": sorted(gaps, key=lambda x: x['target'])
        }
    
    def calculate_skill_gap(db: Session, role_id: int, user_skills: dict):
    requirements = db.query(models.RoleRequirement).filter_by(role_id=role_id).all()
    
    analysis = []
    for req in requirements:
        skill_name = req.skill.skill_name
        target = req.target_level
        current = user_skills.get(skill_name, 0)
        gap = target - current
        
        analysis.append({
            "skill": skill_name,
            "target": target,
            "current": current,
            "gap": max(0, gap),
            "priority": "High" if gap >= 2 else "Medium" if gap == 1 else "None"
        })
    return analysis
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Dict, Any
from .models import Skill, LearningResource

def perform_gap_analysis(role_name: str, user_skills: Dict[str, int], db: Session) -> List[Dict[str, Any]]:
    """
    Compares user skills against a target role.
    Checks the database for high-quality resources (Green Shield).
    """
    # Default target level for a "Senior" role
    target_level = 8 
    gaps_with_resources = []
    
    # Sort skills by gap size (Biggest gaps first)
    sorted_skills = sorted(user_skills.items(), key=lambda x: target_level - x[1], reverse=True)

    for skill_name, current_level in sorted_skills:
        # If user is already good enough, skip
        if current_level >= target_level: continue

        gap_size = target_level - current_level
        
        # 1. DATABASE LOOKUP (Fuzzy Match)
        # Try case-insensitive matching (e.g. 'react' matches 'React')
        skill_record = db.query(Skill).filter(func.lower(Skill.skill_name) == skill_name.lower()).first()
        
        resources = []
        if skill_record:
            # Fetch high-quality DB resources (Tier 1 = Green Shield)
            db_res = db.query(LearningResource)\
                .filter(LearningResource.skill_id == skill_record.skill_id)\
                .order_by(LearningResource.authority_tier.asc())\
                .limit(3).all()
            
            resources = [{
                "title": r.title,
                "provider": r.provider,
                "media_type": r.media_type,
                "url": r.url,
                "est_minutes": r.est_minutes,
                "difficulty_level": r.difficulty_level,
                "authority_tier": r.authority_tier
            } for r in db_res]
        
        # If resources list is empty, ai_agent.py will handle the fallback later
        
        gaps_with_resources.append({
            "skill_name": skill_name,
            "current_level": current_level,
            "target_level": target_level,
            "priority": "High" if gap_size > 4 else "Medium",
            "estimated_hours": gap_size * 2,
            "resources": resources
        })
        
    return gaps_with_resources
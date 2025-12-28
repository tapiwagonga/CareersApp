from ..repositories.assessment_repo import AssessmentRepository
from .. import models, schemas

class AnalysisService:
    def __init__(self, repo: AssessmentRepository):
        self.repo = repo
        # Direct DB access for resources to keep repo clean for now
        self.db = repo.db 

    def process_gap_analysis(self, request: schemas.GapAnalysisRequest) -> schemas.GapAnalysisResponse:
        role = self.repo.get_role_with_requirements(request.role_id)
        if not role:
            return None

        gaps = []
        total_reqs = len(role.requirements)
        met_reqs = 0
        
        for req in role.requirements:
            skill_name = req.skill.skill_name
            target = req.target_level
            current = request.user_skills.get(skill_name, 0)
            
            if current >= target:
                met_reqs += 1
            else:
                gap_val = target - current
                
                # FAIRNESS ALGORITHM: 
                # 1. Authority Tier (Official=1 first)
                # 2. Votes (Popularity second)
                resources = (
                    self.db.query(models.LearningResource)
                    .filter(models.LearningResource.skill_id == req.skill_id)
                    .order_by(models.LearningResource.authority_tier.asc(), models.LearningResource.votes.desc())
                    .limit(3)
                    .all()
                )

                gaps.append(schemas.GapItem(
                    skill_name=skill_name,
                    current_level=current,
                    target_level=target,
                    gap_value=gap_val,
                    priority=self._calculate_priority(gap_val),
                    resources=resources
                ))

        match_pct = round((met_reqs / total_reqs) * 100, 1) if total_reqs > 0 else 100.0

        return schemas.GapAnalysisResponse(
            role_id=role.role_id,
            role_name=role.role_name,
            match_percentage=match_pct,
            missing_skills=gaps
        )

    def _calculate_priority(self, gap: int) -> str:
        if gap >= 2: return "High"
        if gap == 1: return "Medium"
        return "Low"
from __future__ import annotations
from typing import List, Optional, Tuple
from .. import models, schemas
from ..ai_agent import ResourceCurator
from ..repositories.assessment_repo import AssessmentRepository


class AnalysisService:
    def __init__(self, repo: AssessmentRepository):
        self.repo = repo
        self.db = repo.db

    def process_gap_analysis(self, request: schemas.GapAnalysisRequest) -> Optional[schemas.GapAnalysisResponse]:
        role = self.repo.get_role_with_requirements(request.role_id)
        if not role:
            return None

        gaps: List[schemas.GapItem] = []
        total_reqs = len(role.requirements)
        met_reqs = 0

        for req in role.requirements:
            skill_name = req.skill.skill_name
            target = int(req.target_level)
            current = int(request.user_skills.get(skill_name, 0) or 0)

            if current >= target:
                met_reqs += 1
                continue

            gap_val = target - current

            resources = self._get_or_seed_resources(
                skill_id=req.skill_id,
                skill_name=skill_name,
                desired=10,
                default_level="Mid",
                default_style="Visual",
            )

            gaps.append(
                schemas.GapItem(
                    skill_name=skill_name,
                    current_level=current,
                    target_level=target,
                    gap_value=gap_val,
                    priority=self._calculate_priority(gap_val),
                    resources=resources,
                )
            )

        match_pct = round((met_reqs / total_reqs) * 100, 1) if total_reqs > 0 else 100.0

        return schemas.GapAnalysisResponse(
            role_id=role.role_id,
            role_name=role.role_name,
            match_percentage=match_pct,
            missing_skills=gaps,
        )

    def _get_or_seed_resources(
        self,
        skill_id: int,
        skill_name: str,
        desired: int,
        default_level: str,
        default_style: str,
    ) -> List[models.LearningResource]:
        existing = (
            self.db.query(models.LearningResource)
            .filter(models.LearningResource.skill_id == skill_id)
            .order_by(models.LearningResource.authority_tier.asc(), models.LearningResource.votes.desc())
            .limit(desired)
            .all()
        )

        if len(existing) >= min(6, desired):
            return existing

        existing_urls = {
            r.url for r in self.db.query(models.LearningResource.url).filter(models.LearningResource.skill_id == skill_id).all()
        }

        curated = ResourceCurator.curate_resources(skill_name, default_level, default_style)
        to_insert: List[models.LearningResource] = []

        for item in curated:
            meta = item.get("meta", {}) if isinstance(item.get("meta", {}), dict) else {}
            url = str(meta.get("url", "")).strip()
            if not url:
                continue
            if url in existing_urls:
                continue

            media_type = self._map_media_type(str(item.get("type", "deep_dive")))
            provider = str(meta.get("provider") or meta.get("platform") or "Web")
            duration = self._minutes_to_duration(int(item.get("estimated_minutes", 30) or 30))

            authority_tier = self._map_authority_tier(
                media_type=media_type,
                provider=provider,
                quality_score=int(meta.get("quality_score", 0) or 0),
            )

            to_insert.append(
                models.LearningResource(
                    skill_id=skill_id,
                    title=str(item.get("title", "")).strip()[:200],
                    url=url[:500],
                    media_type=media_type[:50],
                    provider=provider[:100],
                    duration=duration[:50],
                    authority_tier=authority_tier,
                    votes=0,
                )
            )
            existing_urls.add(url)

            if len(to_insert) >= desired:
                break

        if to_insert:
            self.db.add_all(to_insert)
            try:
                self.db.commit()
            except Exception:
                self.db.rollback()

        refreshed = (
            self.db.query(models.LearningResource)
            .filter(models.LearningResource.skill_id == skill_id)
            .order_by(models.LearningResource.authority_tier.asc(), models.LearningResource.votes.desc())
            .limit(desired)
            .all()
        )
        return refreshed

    def _map_media_type(self, t: str) -> str:
        k = (t or "").strip().lower()
        if k in {"doc"}:
            return "Documentation"
        if k in {"deep_dive"}:
            return "Deep Dive"
        if k in {"video"}:
            return "Video"
        if k in {"repo"}:
            return "Repository"
        if k in {"interactive"}:
            return "Interactive"
        return "Deep Dive"

    def _minutes_to_duration(self, mins: int) -> str:
        mins = max(5, min(600, int(mins)))
        if mins < 60:
            return f"{mins} mins"
        hours = mins // 60
        rem = mins % 60
        if rem == 0:
            return f"{hours} hours"
        return f"{hours} hours {rem} mins"

    def _map_authority_tier(self, media_type: str, provider: str, quality_score: int) -> int:
        p = (provider or "").lower()
        mt = (media_type or "").lower()

        official_signals = (
            "microsoft",
            "learn.microsoft.com",
            "developer.mozilla.org",
            "python.org",
            "postgresql.org",
            "kubernetes.io",
            "react.dev",
            "aws",
            "cloud.google.com",
        )
        if "documentation" in mt and any(s in p for s in official_signals):
            return 1

        if quality_score >= 75:
            return 2

        return 3

    def _calculate_priority(self, gap: int) -> str:
        if gap >= 2:
            return "High"
        if gap == 1:
            return "Medium"
        return "Low"
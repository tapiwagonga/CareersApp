from typing import Dict, List, Optional
from pydantic import BaseModel, ConfigDict


class SkillBase(BaseModel):
    skill_name: str
    category: Optional[str] = None


class RoleBase(BaseModel):
    role_name: str
    description: Optional[str] = None


class ResourceRead(BaseModel):
    resource_id: int
    title: str
    url: str
    media_type: str
    provider: str
    duration: str
    authority_tier: int
    votes: int

    model_config = ConfigDict(from_attributes=True)


class GapItem(BaseModel):
    skill_name: str
    current_level: int
    target_level: int
    gap_value: int
    priority: str
    resources: List[ResourceRead] = []

    model_config = ConfigDict(from_attributes=True)


class GapAnalysisResponse(BaseModel):
    role_id: int
    role_name: str
    match_percentage: float
    missing_skills: List[GapItem]


class RoleRead(BaseModel):
    role_id: int
    role_name: str
    description: Optional[str]
    model_config = ConfigDict(from_attributes=True)


class GapAnalysisRequest(BaseModel):
    role_id: int
    user_skills: Dict[str, int]

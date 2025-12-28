from typing import List, Dict, Optional
from pydantic import BaseModel, ConfigDict

# --- SHARED ---
class SkillBase(BaseModel):
    skill_name: str
    category: Optional[str] = None

class RoleBase(BaseModel):
    role_name: str
    description: Optional[str] = None

# --- RESOURCES (NEW) ---
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

# --- OUTPUTS (Read) ---
class GapItem(BaseModel):
    skill_name: str
    current_level: int
    target_level: int
    gap_value: int
    priority: str
    # NEW: The list of curated resources for this specific gap
    resources: List[ResourceRead] = [] 

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

# --- INPUTS (Write) ---
class GapAnalysisRequest(BaseModel):
    role_id: int
    user_skills: Dict[str, int]
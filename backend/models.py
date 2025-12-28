from typing import List, Optional
from datetime import datetime
from sqlalchemy import String, ForeignKey, Text, CheckConstraint, DateTime, func, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .database import Base

# --- Static Data (Targets) ---

class Role(Base):
    __tablename__ = "roles"
    __table_args__ = {"schema": "SkillAppModel"}

    role_id: Mapped[int] = mapped_column(primary_key=True, index=True)
    role_name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    description: Mapped[Optional[str]] = mapped_column(Text)
    
    requirements: Mapped[List["RoleRequirement"]] = relationship(
        back_populates="role", cascade="all, delete-orphan"
    )

class Skill(Base):
    __tablename__ = "skills"
    __table_args__ = {"schema": "SkillAppModel"}

    skill_id: Mapped[int] = mapped_column(primary_key=True, index=True)
    skill_name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    category: Mapped[Optional[str]] = mapped_column(String(50))

class RoleRequirement(Base):
    __tablename__ = "role_requirements"
    __table_args__ = (
        CheckConstraint("target_level >= 1 AND target_level <= 5", name="check_target_level_range"),
        {"schema": "SkillAppModel"}
    )

    role_id: Mapped[int] = mapped_column(
        ForeignKey("SkillAppModel.roles.role_id"), primary_key=True
    )
    skill_id: Mapped[int] = mapped_column(
        ForeignKey("SkillAppModel.skills.skill_id"), primary_key=True
    )
    target_level: Mapped[int]

    role: Mapped["Role"] = relationship(back_populates="requirements")
    skill: Mapped["Skill"] = relationship()


# --- User Data (Subjects) ---

class User(Base):
    __tablename__ = "users"
    __table_args__ = {"schema": "SkillAppModel"}

    user_id: Mapped[int] = mapped_column(primary_key=True, index=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    email: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationship to their skills
    user_skills: Mapped[List["UserSkill"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )

class UserSkill(Base):
    """
    Stores the user's CURRENT level in a specific skill.
    """
    __tablename__ = "user_skills"
    __table_args__ = (
        CheckConstraint("current_level >= 1 AND current_level <= 5", name="check_current_level_range"),
        {"schema": "SkillAppModel"}
    )

    user_id: Mapped[int] = mapped_column(
        ForeignKey("SkillAppModel.users.user_id"), primary_key=True
    )
    skill_id: Mapped[int] = mapped_column(
        ForeignKey("SkillAppModel.skills.skill_id"), primary_key=True
    )
    current_level: Mapped[int]  # 1 to 5

    user: Mapped["User"] = relationship(back_populates="user_skills")
    skill: Mapped["Skill"] = relationship()


class LearningResource(Base):
    __tablename__ = "learning_resources"
    __table_args__ = {"schema": "SkillAppModel"}

    resource_id: Mapped[int] = mapped_column(primary_key=True, index=True)
    skill_id: Mapped[int] = mapped_column(ForeignKey("SkillAppModel.skills.skill_id"))
    
    title: Mapped[str] = mapped_column(String(200))
    url: Mapped[str] = mapped_column(String(500))
    
    # Metadata for "Mission Intel" UI
    media_type: Mapped[str] = mapped_column(String(50))   # e.g., "Video", "Course", "Documentation"
    provider: Mapped[str] = mapped_column(String(100))    # e.g., "Google", "Official Docs"
    duration: Mapped[str] = mapped_column(String(50))     # e.g., "10 mins", "4 hours"
    
    # Fairness Algorithm
    # 1 = Official/Canonical (Top Priority)
    # 2 = Industry Standard
    # 3 = Community Content
    authority_tier: Mapped[int] = mapped_column(Integer, default=3)
    
    votes: Mapped[int] = mapped_column(Integer, default=0)
    
    skill: Mapped["Skill"] = relationship()
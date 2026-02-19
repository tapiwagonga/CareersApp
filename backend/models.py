from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class Role(Base):
    __tablename__ = "roles"
    __table_args__ = {"schema": "SkillAppModel"}

    role_id: Mapped[int] = mapped_column(primary_key=True, index=True)
    role_name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    description: Mapped[Optional[str]] = mapped_column(Text)

    requirements: Mapped[List["RoleRequirement"]] = relationship(
        back_populates="role",
        cascade="all, delete-orphan",
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
        {"schema": "SkillAppModel"},
    )

    role_id: Mapped[int] = mapped_column(
        ForeignKey("SkillAppModel.roles.role_id"),
        primary_key=True,
    )
    skill_id: Mapped[int] = mapped_column(
        ForeignKey("SkillAppModel.skills.skill_id"),
        primary_key=True,
    )
    target_level: Mapped[int] = mapped_column(Integer, nullable=False)

    role: Mapped["Role"] = relationship(back_populates="requirements")
    skill: Mapped["Skill"] = relationship()


class User(Base):
    __tablename__ = "users"
    __table_args__ = {"schema": "SkillAppModel"}

    user_id: Mapped[int] = mapped_column(primary_key=True, index=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    email: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user_skills: Mapped[List["UserSkill"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )


class UserSkill(Base):
    __tablename__ = "user_skills"
    __table_args__ = (
        CheckConstraint("current_level >= 1 AND current_level <= 5", name="check_current_level_range"),
        {"schema": "SkillAppModel"},
    )

    user_id: Mapped[int] = mapped_column(
        ForeignKey("SkillAppModel.users.user_id"),
        primary_key=True,
    )
    skill_id: Mapped[int] = mapped_column(
        ForeignKey("SkillAppModel.skills.skill_id"),
        primary_key=True,
    )
    current_level: Mapped[int] = mapped_column(Integer, nullable=False)

    user: Mapped["User"] = relationship(back_populates="user_skills")
    skill: Mapped["Skill"] = relationship()


class LearningResource(Base):
    __tablename__ = "learning_resources"
    __table_args__ = (
        CheckConstraint("authority_tier >= 1 AND authority_tier <= 3", name="check_authority_tier_range"),
        UniqueConstraint("skill_id", "url", name="uq_learning_resource_skill_url"),
        {"schema": "SkillAppModel"},
    )

    resource_id: Mapped[int] = mapped_column(primary_key=True, index=True)
    skill_id: Mapped[int] = mapped_column(ForeignKey("SkillAppModel.skills.skill_id"), index=True)

    title: Mapped[str] = mapped_column(String(200), nullable=False)
    url: Mapped[str] = mapped_column(String(500), nullable=False)

    media_type: Mapped[str] = mapped_column(String(50), nullable=False)
    provider: Mapped[str] = mapped_column(String(100), nullable=False)
    duration: Mapped[str] = mapped_column(String(50), nullable=False)

    authority_tier: Mapped[int] = mapped_column(Integer, default=3, nullable=False)
    votes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    skill: Mapped["Skill"] = relationship()

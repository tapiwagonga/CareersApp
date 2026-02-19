import sys
import os

# Add the parent directory to sys.path so we can import from 'backend'
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from backend.database import SessionLocal, engine, Base
from backend import models

def seed_backend_developer_path(db: Session):
    print("🌱 Seeding: Backend Software Developer Path...")

    # 1. Define the Role
    role = models.Role(
        role_name="Backend Software Developer",
        description="Builds and maintains server-side logic, databases, and APIs."
    )
    db.add(role)
    db.commit()
    db.refresh(role)

    # 2. Define Skills (Nodes)
    # We create variables so we can link them easily later
    s_python = models.Skill(skill_name="Python Fundamentals", category="Language")
    s_sql = models.Skill(skill_name="SQL & Database Design", category="Database")
    s_api = models.Skill(skill_name="REST API Design", category="Backend")
    s_docker = models.Skill(skill_name="Docker", category="DevOps")
    s_k8s = models.Skill(skill_name="Kubernetes", category="DevOps")
    s_cicd = models.Skill(skill_name="CI/CD Pipelines", category="DevOps")
    s_system = models.Skill(skill_name="System Design", category="Architecture")

    skills = [s_python, s_sql, s_api, s_docker, s_k8s, s_cicd, s_system]
    db.add_all(skills)
    db.commit()

    # Refresh to get IDs
    for s in skills: db.refresh(s)

    # 3. Define Dependencies (The DAG Edges)
    # Logic: Python -> API, API -> Docker, Docker -> Kubernetes
    s_api.prerequisite_id = s_python.skill_id
    s_sql.prerequisite_id = s_python.skill_id
    s_docker.prerequisite_id = s_api.skill_id
    s_k8s.prerequisite_id = s_docker.skill_id
    s_cicd.prerequisite_id = s_docker.skill_id
    s_system.prerequisite_id = s_api.skill_id

    db.commit()

    # 4. Link Skills to Role (Requirements)
    # Target Level 1-5
    requirements = [
        models.RoleRequirement(role_id=role.role_id, skill_id=s_python.skill_id, target_level=4),
        models.RoleRequirement(role_id=role.role_id, skill_id=s_sql.skill_id, target_level=3),
        models.RoleRequirement(role_id=role.role_id, skill_id=s_api.skill_id, target_level=4),
        models.RoleRequirement(role_id=role.role_id, skill_id=s_docker.skill_id, target_level=3),
        models.RoleRequirement(role_id=role.role_id, skill_id=s_k8s.skill_id, target_level=2), # Junior doesn't need mastery
        models.RoleRequirement(role_id=role.role_id, skill_id=s_cicd.skill_id, target_level=2),
        models.RoleRequirement(role_id=role.role_id, skill_id=s_system.skill_id, target_level=2),
    ]
    db.add_all(requirements)
    db.commit()

    # 5. Add Resources (with Time & Authority)
    # Tiers: 1=Official, 2=Industry Course, 3=Blog/Video
    # Difficulty: 1=Read, 3=Analyze, 6=Build (Multiplies time)
    
    resources = [
        # Python Resources
        models.LearningResource(
            skill_id=s_python.skill_id,
            title="Python 3 Official Documentation",
            url="https://docs.python.org/3/tutorial/index.html",
            media_type="Documentation",
            provider="Python Software Foundation",
            duration_text="Ref",
            est_minutes=60,
            difficulty_level=2,
            authority_tier=1
        ),
        models.LearningResource(
            skill_id=s_python.skill_id,
            title="Build a CLI Tool with Python",
            url="https://realpython.com/python-cli-click-cookiecutter/",
            media_type="Project",
            provider="RealPython",
            duration_text="2 hours",
            est_minutes=120,
            difficulty_level=5, # High difficulty = Active Learning
            authority_tier=2
        ),

        # API Resources
        models.LearningResource(
            skill_id=s_api.skill_id,
            title="FastAPI User Guide",
            url="https://fastapi.tiangolo.com/tutorial/",
            media_type="Documentation",
            provider="FastAPI",
            duration_text="3 hours",
            est_minutes=180,
            difficulty_level=3,
            authority_tier=1
        ),

        # Docker Resources
        models.LearningResource(
            skill_id=s_docker.skill_id,
            title="Docker Curiosity Course",
            url="https://www.youtube.com/watch?v=fqMOX6JJhGo",
            media_type="Video",
            provider="Traversy Media",
            duration_text="1 hour",
            est_minutes=60,
            difficulty_level=1, # Passive Watch
            authority_tier=3
        ),
        models.LearningResource(
            skill_id=s_docker.skill_id,
            title="Containerize a Python App",
            url="https://docker-curriculum.com/",
            media_type="Project",
            provider="Docker Curriculum",
            duration_text="2 hours",
            est_minutes=120,
            difficulty_level=6, # Build task
            authority_tier=2
        ),
    ]

    db.add_all(resources)
    db.commit()
    print("✅ Backend Developer Path Seeded Successfully!")

def main():
    # Create Tables
    models.Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        # Optional: Clear existing data to avoid duplicates
        # db.query(models.Role).delete()
        # db.query(models.Skill).delete()
        # db.commit()
        
        seed_backend_developer_path(db)
    finally:
        db.close()

if __name__ == "__main__":
    main()
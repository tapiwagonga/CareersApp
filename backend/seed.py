from sqlalchemy import insert, select, delete
from .database import SessionLocal
from . import models

# --- 1. Roles & Skills Logic (Refactored for clarity) ---
def seed_roles(db, roles_data):
    existing_roles = set(db.execute(select(models.Role.role_name)).scalars().all())
    new_roles = [r for r in roles_data if r["role_name"] not in existing_roles]
    
    if new_roles:
        db.execute(insert(models.Role), new_roles)
        db.commit()
        print(f"Seeded {len(new_roles)} new roles.")

def seed_skills(db, skills_data):
    existing_skills = set(db.execute(select(models.Skill.skill_name)).scalars().all())
    new_skills = [s for s in skills_data if s["skill_name"] not in existing_skills]

    if new_skills:
        db.execute(insert(models.Skill), new_skills)
        db.commit()
        print(f"Seeded {len(new_skills)} new skills.")

def seed_requirements(db, role_skill_map):
    # Fetch IDs to map names -> integers
    roles = db.execute(select(models.Role.role_name, models.Role.role_id)).all()
    skills = db.execute(select(models.Skill.skill_name, models.Skill.skill_id)).all()
    
    role_map = {name: r_id for name, r_id in roles}
    skill_map = {name: s_id for name, s_id in skills}

    requirements_payload = []
    for role_name, reqs in role_skill_map.items():
        if role_name not in role_map: continue
        
        r_id = role_map[role_name]
        for skill_name, level in reqs:
            if skill_name in skill_map:
                requirements_payload.append({
                    "role_id": r_id,
                    "skill_id": skill_map[skill_name],
                    "target_level": level
                })
    
    # Check for duplicates (if not resetting)
    existing_reqs = db.execute(select(models.RoleRequirement.role_id, models.RoleRequirement.skill_id)).all()
    existing_keys = {(r, s) for r, s in existing_reqs}
    
    final_payload = [
        d for d in requirements_payload 
        if (d["role_id"], d["skill_id"]) not in existing_keys
    ]

    if final_payload:
        db.execute(insert(models.RoleRequirement), final_payload)
        db.commit()
        print(f"Seeded {len(final_payload)} role requirements.")

# --- 2. New Resource Logic (Mission Intel) ---
def seed_resources(db):
    print("Seeding Intel Resources...")
    skills = db.execute(select(models.Skill.skill_name, models.Skill.skill_id)).all()
    skill_map = {name: s_id for name, s_id in skills}
    
    # TIER 1 = Official Docs | TIER 2 = Industry Standard | TIER 3 = Community
    resources_data = [
        # Python
        {"skill": "Python", "title": "Official Python Docs", "url": "https://docs.python.org/3/", "type": "Documentation", "provider": "Python Software Foundation", "duration": "Reference", "tier": 1},
        {"skill": "Python", "title": "CS50's Introduction to Python", "url": "https://cs50.harvard.edu/python/", "type": "Course", "provider": "Harvard University", "duration": "10 Weeks", "tier": 2},
        {"skill": "Python", "title": "Full Stack Python", "url": "https://www.fullstackpython.com/", "type": "Guide", "provider": "Matt Makai", "duration": "Self-paced", "tier": 3},
        
        # React
        {"skill": "React", "title": "React.dev: The Official Guide", "url": "https://react.dev/learn", "type": "Documentation", "provider": "Meta", "duration": "Reference", "tier": 1},
        {"skill": "React", "title": "Epic React", "url": "https://epicreact.dev/", "type": "Course", "provider": "Kent C. Dodds", "duration": "20 Hours", "tier": 2},
        
        # Docker
        {"skill": "Docker", "title": "Docker Curriculum", "url": "https://docker-curriculum.com/", "type": "Interactive", "provider": "Prakhar Srivastav", "duration": "2 Hours", "tier": 3},
        {"skill": "Docker", "title": "Official Docker Get Started", "url": "https://docs.docker.com/get-started/", "type": "Documentation", "provider": "Docker Inc", "duration": "1 Hour", "tier": 1},
        
        # FastAPI
        {"skill": "FastAPI", "title": "FastAPI Documentation", "url": "https://fastapi.tiangolo.com/", "type": "Documentation", "provider": "Sebastián Ramírez", "duration": "Reference", "tier": 1},
        
        # PostgreSQL
        {"skill": "PostgreSQL", "title": "PostgreSQL Tutorial", "url": "https://www.postgresqltutorial.com/", "type": "Guide", "provider": "PostgresTutorial", "duration": "Self-paced", "tier": 3},
    ]
    
    inserts = []
    for r in resources_data:
        if r["skill"] in skill_map:
            inserts.append({
                "skill_id": skill_map[r["skill"]],
                "title": r["title"],
                "url": r["url"],
                "media_type": r["type"],
                "provider": r["provider"],
                "duration": r["duration"],
                "authority_tier": r["tier"],
                "votes": 0
            })
    
    # We clear old resources to ensure fresh "Intel" on every seed
    db.execute(delete(models.LearningResource))
    
    if inserts:
        db.execute(insert(models.LearningResource), inserts)
        db.commit()
        print(f"Seeded {len(inserts)} intel resources.")

# --- 3. Main Execution Orchestrator ---
def run_seed(reset_db=False):
    db = SessionLocal()
    try:
        # DATA DEFINITIONS
        roles_data = [
            {"role_name": "Backend Developer", "description": "Server, API, and Database focus."},
            {"role_name": "Frontend Developer", "description": "UI, UX, and Client-side focus."},
            {"role_name": "Full Stack Developer", "description": "Handles both ends of the stack."},
            {"role_name": "DevOps Engineer", "description": "CI/CD, Cloud, and Infrastructure."},
        ]

        skills_data = [
            {"skill_name": "Python", "category": "Backend"},
            {"skill_name": "FastAPI", "category": "Backend"},
            {"skill_name": "PostgreSQL", "category": "Database"},
            {"skill_name": "React", "category": "Frontend"},
            {"skill_name": "TypeScript", "category": "Frontend"},
            {"skill_name": "Docker", "category": "DevOps"},
            {"skill_name": "AWS", "category": "Cloud"},
            {"skill_name": "CI/CD", "category": "DevOps"},
        ]

        role_skill_map = {
            "Backend Developer": [("Python", 4), ("FastAPI", 4), ("PostgreSQL", 3), ("Docker", 2)],
            "Frontend Developer": [("React", 4), ("TypeScript", 4), ("CI/CD", 1)],
            "Full Stack Developer": [("Python", 3), ("React", 3), ("PostgreSQL", 3), ("AWS", 2)],
            "DevOps Engineer": [("Docker", 5), ("AWS", 4), ("CI/CD", 5), ("Python", 3)],
        }

        # RESET LOGIC
        if reset_db:
            print("--- Wiping Database ---")
            # Order is critical for Foreign Keys!
            db.execute(delete(models.LearningResource))
            db.execute(delete(models.RoleRequirement))
            db.execute(delete(models.Skill))
            db.execute(delete(models.Role))
            db.commit()

        # SEEDING STEPS
        seed_roles(db, roles_data)
        seed_skills(db, skills_data)
        seed_requirements(db, role_skill_map)
        seed_resources(db)
        
        print("--- Seeding Complete ---")

    except Exception as e:
        db.rollback()
        print(f"Seeding Failed: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    # Change to False if you want to keep existing data
    run_seed(reset_db=False)
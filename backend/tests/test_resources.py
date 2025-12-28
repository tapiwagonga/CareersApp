import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.main import app, get_db
from backend.database import Base
from backend import models, schemas

# --- 1. Setup Test Database (In-Memory SQLite) ---
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    connect_args={"check_same_thread": False}, 
    poolclass=StaticPool
)

@event.listens_for(engine, "connect")
def do_connect(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("ATTACH DATABASE ':memory:' AS SkillAppModel")
    cursor.close()

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)

# --- 2. Seed Data with Resources ---
@pytest.fixture(scope="module")
def test_db():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    
    # 1. Create Role & Skill
    skill_py = models.Skill(skill_name="Python", category="Backend")
    role = models.Role(role_name="Backend Developer", description="Test Role")
    db.add_all([skill_py, role])
    db.commit()
    
    # 2. Add Requirement (User needs Python)
    req = models.RoleRequirement(
        role_id=role.role_id, 
        skill_id=skill_py.skill_id, 
        target_level=3
    )
    db.add(req)
    
    # 3. Add Resources (The "Mission Intel")
    # Tier 3: A random blog
    res_blog = models.LearningResource(
        skill_id=skill_py.skill_id,
        title="Random Python Blog",
        url="http://blog.com",
        media_type="Article",
        provider="Medium",
        duration="5 min",
        authority_tier=3, # Low Priority
        votes=0
    )
    # Tier 1: Official Docs
    res_official = models.LearningResource(
        skill_id=skill_py.skill_id,
        title="Official Docs",
        url="http://python.org",
        media_type="Documentation",
        provider="Python Org",
        duration="Always",
        authority_tier=1, # High Priority
        votes=10
    )
    
    db.add_all([res_blog, res_official])
    db.commit()
    
    yield db 
    
    db.close()
    Base.metadata.drop_all(bind=engine)

# --- 3. The Validation Test ---

def test_resources_are_sorted_by_authority(test_db):
    """
    Ensures that when a gap is found, the API returns resources
    sorted by Authority Tier (1 first, then 3).
    """
    payload = {
        "role_id": 1,
        "user_skills": {"Python": 1} # Gap exists
    }
    
    response = client.post("/api/v1/analyze", json=payload)
    assert response.status_code == 200
    
    data = response.json()
    gap = data["missing_skills"][0]
    
    # Verify resources exist
    assert len(gap["resources"]) == 2
    
    # Verify Sorting Logic: Index 0 should be Tier 1 (Official)
    first_resource = gap["resources"][0]
    second_resource = gap["resources"][1]
    
    assert first_resource["authority_tier"] == 1
    assert first_resource["title"] == "Official Docs"
    
    assert second_resource["authority_tier"] == 3
    assert second_resource["title"] == "Random Python Blog"
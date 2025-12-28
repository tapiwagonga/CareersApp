import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Absolute imports (Best practice)
from backend.main import app, get_db
from backend.database import Base
from backend import models

# --- 1. Setup Test Database (In-Memory SQLite) ---
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    connect_args={"check_same_thread": False}, 
    poolclass=StaticPool
)

# --- FIX: Mock the Postgres Schema for SQLite ---
# This listens for the "connect" event and creates the schema alias
@event.listens_for(engine, "connect")
def do_connect(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    # This makes SQLite treat "SkillAppModel" as a valid database/schema
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

# --- 2. Fixtures (Seed Data) ---
@pytest.fixture(scope="module")
def test_db():
    # Create tables
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    
    # Seed Data
    skill_py = models.Skill(skill_name="Python", category="Backend")
    skill_react = models.Skill(skill_name="React", category="Frontend")
    db.add_all([skill_py, skill_react])
    db.commit()
    
    role = models.Role(role_name="Backend Developer", description="Test Role")
    db.add(role)
    db.commit()
    
    # Requirement: Backend Dev needs Python Level 3
    req = models.RoleRequirement(
        role_id=role.role_id, 
        skill_id=skill_py.skill_id, 
        target_level=3
    )
    db.add(req)
    db.commit()
    
    yield db 
    
    # Teardown
    db.close()
    Base.metadata.drop_all(bind=engine)

# --- 3. The Tests ---

def test_read_roles(test_db):
    """Verify we can fetch the list of roles."""
    response = client.get("/api/v1/roles")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["role_name"] == "Backend Developer"

def test_analyze_gap_perfect_match(test_db):
    """Verify 100% match when user meets target."""
    payload = {
        "role_id": 1,
        "user_skills": {"Python": 3}
    }
    response = client.post("/api/v1/analyze", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["match_percentage"] == 100.0
    assert len(data["missing_skills"]) == 0

def test_analyze_gap_found(test_db):
    """Verify gap detection works correctly."""
    payload = {
        "role_id": 1,
        "user_skills": {"Python": 1} # Target is 3, Gap is 2
    }
    response = client.post("/api/v1/analyze", json=payload)
    assert response.status_code == 200
    data = response.json()
    
    assert data["match_percentage"] == 0.0
    assert len(data["missing_skills"]) == 1
    
    gap = data["missing_skills"][0]
    assert gap["skill_name"] == "Python"
    assert gap["gap_value"] == 2 
    assert gap["priority"] == "High"

def test_analyze_role_not_found(test_db):
    """Verify 404 error for invalid Role ID."""
    payload = {
        "role_id": 999,
        "user_skills": {}
    }
    response = client.post("/api/v1/analyze", json=payload)
    assert response.status_code == 404
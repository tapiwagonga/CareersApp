# SkillGapApp: Interpretable Career Architecture

An intelligent recommender system designed to bridge the gap between current worker capabilities and target role requirements using a transparent, "White Box" logic.

## Technical Stack
* **Frontend:** React (Stateful Roadmap UI)
* **Backend:** FastAPI (Asynchronous Logic Layer)
* **Database:** PostgreSQL (JSONB Persistence & Controlled Vocabulary)
* **AI Engine:** Google Gemini (Semantic Analysis & Pedagogical Ordering)

## Setup Instructions

### 1. Environment Configuration
Create a `.env` file in both the `/frontend` and `/backend` directories using the provided templates.

### 2. Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload

"""
session_manager.py
Session CRUD using flat JSON files.
Each session is /data/sessions/{session_id}.json
"""
import json
import os
import uuid
from datetime import datetime

SESSIONS_DIR = os.path.join(os.path.dirname(__file__), "data", "sessions")
os.makedirs(SESSIONS_DIR, exist_ok=True)


def create_session(resume_hash: str, config: dict) -> dict:
    session_id = str(uuid.uuid4())[:8]
    session = {
        "session_id": session_id,
        "resume_hash": resume_hash,
        "config": config,
        "started_at": datetime.utcnow().isoformat(),
        "completed_at": None,
        "questions": [],
        "status": "active"
    }
    _save(session_id, session)
    return session


def add_question(session_id: str, q_data: dict) -> dict:
    session = load(session_id)
    session["questions"].append({
        "q_data": q_data,
        "user_answer": None,
        "score_result": None,
        "is_followup": q_data.get("is_followup", False),
        "skipped": False,
        "answered_at": None
    })
    _save(session_id, session)
    return session


def record_answer(session_id: str, q_index: int, user_answer: str, score_result: dict) -> dict:
    session = load(session_id)
    session["questions"][q_index]["user_answer"] = user_answer
    session["questions"][q_index]["score_result"] = score_result
    session["questions"][q_index]["answered_at"] = datetime.utcnow().isoformat()
    _save(session_id, session)
    return session


def record_skip(session_id: str, q_index: int) -> dict:
    session = load(session_id)
    session["questions"][q_index]["skipped"] = True
    session["questions"][q_index]["score_result"] = {
        "final_score": 0,
        "llm_score": 0,
        "keyword_coverage": {"matched": [], "unmatched": [], "ratio": 0, "display": "Skipped"},
        "strengths": [],
        "gaps": ["No answer provided"],
        "ideal_hint": "",
        "follow_up_question": None
    }
    _save(session_id, session)
    return session


def complete_session(session_id: str, summary: dict) -> dict:
    session = load(session_id)
    session["status"] = "completed"
    session["completed_at"] = datetime.utcnow().isoformat()
    session["summary"] = summary
    _save(session_id, session)
    return session


def load(session_id: str) -> dict:
    path = os.path.join(SESSIONS_DIR, f"{session_id}.json")
    if not os.path.exists(path):
        raise FileNotFoundError(f"Session {session_id} not found")
    with open(path) as f:
        return json.load(f)


def _save(session_id: str, data: dict):
    path = os.path.join(SESSIONS_DIR, f"{session_id}.json")
    with open(path, "w") as f:
        json.dump(data, f, indent=2)
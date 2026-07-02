import json
import os
import uuid
from datetime import datetime, timezone


DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
SESSION_DIR = os.path.join(DATA_DIR, "sessions")


def load_resume(resume_hash: str) -> dict:
    path = os.path.join(DATA_DIR, "resumes", f"{resume_hash}.json")
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def save_resume(resume_hash: str, resume: dict) -> dict:
    path = os.path.join(DATA_DIR, "resumes", f"{resume_hash}.json")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(resume, f, indent=2)
    return resume


def save_session(payload: dict) -> dict:
    os.makedirs(SESSION_DIR, exist_ok=True)
    session_id = payload.get("session_id") or uuid.uuid4().hex[:12]
    payload["session_id"] = session_id
    payload["saved_at"] = datetime.now(timezone.utc).isoformat()
    with open(os.path.join(SESSION_DIR, f"{session_id}.json"), "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)
    return payload


def compute_heatmap(questions: list[dict]) -> list[dict]:
    grouped = {}
    for item in questions:
        topic = item.get("topic") or item.get("question", {}).get("topic") or "general"
        score = item.get("final_score") or item.get("score", 0)
        grouped.setdefault(topic, []).append(float(score))
    heatmap = []
    for topic, scores in grouped.items():
        avg = round(sum(scores) / len(scores), 1)
        heatmap.append({
            "topic": topic,
            "questions": len(scores),
            "avg_score": avg,
            "status": score_to_status(avg),
        })
    return sorted(heatmap, key=lambda row: row["avg_score"])


def score_to_status(avg: float) -> str:
    if avg >= 8:
        return "strong"
    if avg >= 6.5:
        return "good"
    if avg >= 5:
        return "needs_work"
    return "gap"

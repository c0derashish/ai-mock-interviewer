import os

from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS

from groq_client import call_groq, has_groq_key
from prompts import gap_plan_prompt, question_prompt, scoring_prompt
from resume_parser import parse_resume
from scorer import hybrid_score, local_score
from session_manager import compute_heatmap, load_resume, save_resume, save_session

load_dotenv()

app = Flask(__name__)
CORS(app)


@app.get("/health")
def health():
    return jsonify({"ok": True, "groq_enabled": has_groq_key()})


@app.post("/parse-resume")
def parse_resume_endpoint():
    file = request.files.get("resume")
    if not file:
        return jsonify({"error": "Upload a PDF as field 'resume'."}), 400
    if not file.filename.lower().endswith(".pdf"):
        return jsonify({"error": "Only PDF resumes are supported."}), 400
    data, cached = parse_resume(file.read(), file.filename)
    return jsonify({"cached": cached, "data": data, "resume_hash": data["resume_id"]})


@app.get("/resume/<resume_hash>")
def get_resume(resume_hash):
    try:
        return jsonify({"data": load_resume(resume_hash), "cached": True})
    except FileNotFoundError:
        return jsonify({"error": "Resume not found"}), 404


@app.put("/resume/<resume_hash>")
def update_resume(resume_hash):
    payload = request.get_json(force=True)
    payload["resume_id"] = resume_hash
    return jsonify({"data": save_resume(resume_hash, payload)})


@app.post("/generate-question")
def generate_question_endpoint():
    payload = request.get_json(force=True)
    resume = load_resume(payload["resume_hash"])
    config = payload.get("config", {})
    history = payload.get("history", [])
    force_easy = payload.get("force_easy", False)

    if has_groq_key():
        try:
            question = call_groq(question_prompt(resume, config, history))
            if force_easy:
                question["question"] = "Warm-up: " + question["question"]
            return jsonify({"data": question, "source": "groq"})
        except Exception:
            pass
    return jsonify({"data": local_question(resume, config, history, force_easy), "source": "local_fallback"})


@app.post("/score-answer")
def score_answer_endpoint():
    payload = request.get_json(force=True)
    resume = load_resume(payload["resume_hash"])
    question = payload.get("question", {})
    answer = payload.get("answer", "")
    if not answer.strip():
        detail = {
            "llm_score": 0,
            "strengths": [],
            "gaps": ["No response logged."],
            "ideal_hint": "Say what you know, then state assumptions instead of going silent.",
            "follow_up_question": "What is one partial approach you would try first?",
            "follow_up_depth": "Checks recovery under pressure.",
        }
    elif has_groq_key():
        try:
            detail = call_groq(scoring_prompt(question, answer, resume), model="llama3-8b-8192")
        except Exception:
            detail = local_score(question, answer)
    else:
        detail = local_score(question, answer)

    final, keyword_detail = hybrid_score(question, answer, detail.get("llm_score", 0))
    detail["final_score"] = final
    detail["keyword_detail"] = keyword_detail
    return jsonify({"data": detail})


@app.post("/generate-summary")
def generate_summary_endpoint():
    payload = request.get_json(force=True)
    resume = load_resume(payload["resume_hash"])
    questions = payload.get("questions", [])
    heatmap = compute_heatmap(questions)
    weak = [row for row in heatmap if row["status"] in {"gap", "needs_work"}][:5]

    if has_groq_key() and weak:
        try:
            plan = call_groq(gap_plan_prompt(weak, resume))
        except Exception:
            plan = local_gap_plan(weak)
    else:
        plan = local_gap_plan(weak)

    avg = round(sum((q.get("final_score") or q.get("score", 0)) for q in questions) / max(1, len(questions)), 1)
    summary = {
        "score": round(avg * 10),
        "average_score": avg,
        "label": "Interview Ready" if avg >= 7.2 else "Almost There" if avg >= 5.8 else "Needs Focused Practice",
        "heatmap": heatmap,
        "gap_plan": plan,
    }
    saved = save_session({**payload, "summary": summary})
    return jsonify({"data": summary, "session_id": saved["session_id"]})


def local_question(resume: dict, config: dict, history: list[dict], force_easy: bool = False) -> dict:
    skills = [skill for group in resume.get("skills", {}).values() for skill in group]
    projects = resume.get("projects", [])
    role = config.get("role", "Software Engineer")
    q_num = len([h for h in history if not h.get("is_followup")])
    if force_easy:
        topic = skills[0] if skills else "resume basics"
        question = f"Explain {topic} as if you are walking me through it in your own project."
        q_type = "technical"
    elif q_num % 3 == 0 and projects:
        project = projects[q_num % len(projects)]
        topic = project.get("name", "project")
        question = f"In {topic}, what was one technical tradeoff you made, and how did you validate it?"
        q_type = "resume-based"
    elif q_num % 3 == 1:
        topic = skills[q_num % len(skills)] if skills else role
        question = f"For a {role} role, how would you design and test a feature using {topic}?"
        q_type = "technical"
    else:
        topic = "ownership"
        question = "Tell me about a time you got stuck on a project. What did you try before asking for help?"
        q_type = "behavioral"
    return {
        "question": question,
        "type": q_type,
        "topic": topic,
        "expected_keywords": infer_keywords(topic, skills),
        "hint_for_scorer": "Look for structure, concrete examples, tradeoffs, and measurable impact.",
    }


def infer_keywords(topic: str, skills: list[str]) -> list[str]:
    base = ["tradeoff", "testing", "impact", "edge case"]
    chosen = [skill for skill in skills if skill.lower() in topic.lower()][:2]
    return (chosen + base)[:6]


def local_gap_plan(weak_topics: list[dict]) -> dict:
    return {
        "gap_plans": [
            {
                "topic": row["topic"],
                "core_concept_missing": "Depth, examples, or tradeoff vocabulary.",
                "fix_in": "1 week",
                "practice_resource": "GFG topic notes + 5 LeetCode tagged problems + one mock answer recording.",
                "resume_angle": "Prepare a 45-second story that connects this topic to a project decision.",
            }
            for row in weak_topics
        ],
        "next_session_focus": "Retry the two weakest topics with stricter follow-up questions.",
        "overall_advice": "Your next jump comes from sharper structure: answer, reason, tradeoff, proof.",
    }


if __name__ == "__main__":
    port = int(os.getenv("PORT", "5000"))
    app.run(host="127.0.0.1", port=port, debug=True)

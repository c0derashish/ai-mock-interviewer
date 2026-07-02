"""
app.py
Flask API — thin routes. All logic delegated to modules.
"""
import hashlib
import io
import json
import os

import pdfplumber
from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS

from groq_client import call_groq
from prompts import (
    fuzzy_parse_prompt,
    gap_plan_prompt,
    generate_question_prompt,
    reeval_answer_prompt,
    score_answer_prompt,
)
from resume_parser import rule_based_extract
from scorer import build_score_result
from session_manager import (
    add_question,
    complete_session,
    create_session,
    load as load_session,
    record_answer,
    record_skip,
)

load_dotenv()

app = Flask(__name__)
CORS(app)

RESUMES_DIR = os.path.join(os.path.dirname(__file__), "data", "resumes")
os.makedirs(RESUMES_DIR, exist_ok=True)


# ─── Resume ──────────────────────────────────────────────────────────────────

@app.route("/parse-resume", methods=["POST"])
def parse_resume():
    if "resume" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    pdf_bytes = request.files["resume"].read()
    resume_hash = hashlib.md5(pdf_bytes).hexdigest()
    cached_path = os.path.join(RESUMES_DIR, f"{resume_hash}.json")

    # Cache hit — return immediately
    if os.path.exists(cached_path):
        with open(cached_path) as f:
            data = json.load(f)
        return jsonify({"cached": True, "resume_id": resume_hash, "data": data})

    # Extract text
    try:
        with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
            raw_text = "\n".join(
                page.extract_text() or "" for page in pdf.pages
            )
    except Exception as e:
        return jsonify({"error": f"PDF parse failed: {str(e)}"}), 422

    if not raw_text.strip():
        return jsonify({"error": "Could not extract text from PDF"}), 422

    # Rule-based extraction (no LLM)
    rule_data = rule_based_extract(raw_text)
    unparsed = rule_data.pop("_unparsed", {})
    parse_method = rule_data.pop("_parse_method", {})

    # Groq fix-up for fuzzy fields (projects, experience)
    llm_data = {"projects": [], "experience": []}
    if unparsed:
        try:
            llm_data = call_groq(
                fuzzy_parse_prompt(unparsed),
                model="llama-3.3-70b-versatile",
                max_tokens=1200
            )
            parse_method["projects"] = "groq_llm"
            parse_method["experience"] = "groq_llm"
        except Exception as e:
            print(f"Groq fuzzy parse failed: {e}")

    # Merge
    final = {
        **rule_data,
        "projects": llm_data.get("projects", []),
        "experience": llm_data.get("experience", []),
        "resume_id": resume_hash,
        "parse_method": parse_method,
        "raw_text_length": len(raw_text),
    }

    # Save
    with open(cached_path, "w") as f:
        json.dump(final, f, indent=2)

    return jsonify({"cached": False, "resume_id": resume_hash, "data": final})


@app.route("/resume/<resume_hash>", methods=["GET"])
def get_resume(resume_hash):
    path = os.path.join(RESUMES_DIR, f"{resume_hash}.json")
    if not os.path.exists(path):
        return jsonify({"error": "Resume not found"}), 404
    with open(path) as f:
        return jsonify(json.load(f))


@app.route("/resume/<resume_hash>", methods=["PUT"])
def update_resume(resume_hash):
    """Allow user to correct parsed data from UI."""
    path = os.path.join(RESUMES_DIR, f"{resume_hash}.json")
    if not os.path.exists(path):
        return jsonify({"error": "Resume not found"}), 404

    updates = request.json
    with open(path) as f:
        data = json.load(f)

    # Merge user corrections
    for key, value in updates.items():
        if key not in ("resume_id", "parsed_at"):
            data[key] = value
    data["user_edited"] = True

    with open(path, "w") as f:
        json.dump(data, f, indent=2)

    return jsonify({"success": True, "data": data})


# ─── Session ─────────────────────────────────────────────────────────────────

@app.route("/session/create", methods=["POST"])
def create_session_route():
    body = request.json
    resume_hash = body.get("resume_hash")
    config = body.get("config", {})

    if not resume_hash:
        return jsonify({"error": "resume_hash required"}), 400

    session = create_session(resume_hash, config)
    return jsonify(session)


@app.route("/session/<session_id>", methods=["GET"])
def get_session(session_id):
    try:
        return jsonify(load_session(session_id))
    except FileNotFoundError:
        return jsonify({"error": "Session not found"}), 404


# ─── Interview ───────────────────────────────────────────────────────────────

@app.route("/generate-question", methods=["POST"])
def generate_question():
    body = request.json
    resume_hash = body.get("resume_hash")
    config = body.get("config", {})
    history = body.get("history", [])

    # Load resume from disk
    resume_path = os.path.join(RESUMES_DIR, f"{resume_hash}.json")
    if not os.path.exists(resume_path):
        return jsonify({"error": "Resume not found"}), 404
    with open(resume_path) as f:
        resume = json.load(f)

    try:
        question = call_groq(
            generate_question_prompt(resume, config, history),
            model="llama-3.3-70b-versatile",
            max_tokens=600
        )
        return jsonify(question)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/score-answer", methods=["POST"])
def score_answer():
    body = request.json
    question_data = body.get("question_data", {})
    user_answer = body.get("user_answer", "").strip()
    resume_hash = body.get("resume_hash")

    if not user_answer:
        return jsonify({"error": "Empty answer"}), 400

    # Load resume
    resume_path = os.path.join(RESUMES_DIR, f"{resume_hash}.json")
    resume = {}
    if os.path.exists(resume_path):
        with open(resume_path) as f:
            resume = json.load(f)

    # Use llama3-8b for scoring (faster, cheaper)
    try:
        is_followup = body.get("is_followup", False)
        if is_followup:
            from backend.prompts import generate_followup_score_prompt
            llm_result = call_groq(
                generate_followup_score_prompt(
                    question_data.get("question", ""),
                    user_answer,
                    question_data.get("topic", "")
                ),
                model="llama-3.1-8b-instant",
                max_tokens=500
            )
        else:
            llm_result = call_groq(
                score_answer_prompt(question_data, user_answer, resume),
                model="llama-3.1-8b-instant",
                max_tokens=600
            )

        result = build_score_result(question_data, user_answer, llm_result)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/reeval-answer", methods=["POST"])
def reeval_answer():
    """Challenge Me: re-evaluate with generous rubric."""
    body = request.json
    question_data = body.get("question_data", {})
    user_answer = body.get("user_answer", "")
    original_score = body.get("original_score", 5)

    try:
        result = call_groq(
            reeval_answer_prompt(question_data, user_answer),
            model="llama-3.1-8b-instant",
            max_tokens=400
        )
        result["original_score"] = original_score
        result["delta"] = round(result.get("reeval_score", original_score) - original_score, 1)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/generate-summary", methods=["POST"])
def generate_summary():
    body = request.json
    session_questions = body.get("questions", [])
    resume_hash = body.get("resume_hash")

    # Load resume
    resume_path = os.path.join(RESUMES_DIR, f"{resume_hash}.json")
    resume = {}
    if os.path.exists(resume_path):
        with open(resume_path) as f:
            resume = json.load(f)

    # Compute heatmap locally (no LLM)
    topic_groups = {}
    for q in session_questions:
        score_r = q.get("score_result") or {}
        final_score = score_r.get("final_score", 0)
        topic = q.get("q_data", {}).get("topic", "Unknown")
        if topic not in topic_groups:
            topic_groups[topic] = []
        topic_groups[topic].append(final_score)

    heatmap = []
    for topic, scores in topic_groups.items():
        avg = sum(scores) / len(scores)
        status = "strong" if avg >= 8 else "good" if avg >= 6.5 else "needs_work" if avg >= 5 else "gap"
        heatmap.append({
            "topic": topic,
            "questions": len(scores),
            "avg_score": round(avg, 1),
            "status": status
        })

    # Compute overall score
    all_scores = [
        (q.get("score_result") or {}).get("final_score", 0)
        for q in session_questions
    ]
    overall = round((sum(all_scores) / len(all_scores)) * 10, 1) if all_scores else 0
    label = (
        "Strong Candidate" if overall >= 80 else
        "Interview Ready" if overall >= 65 else
        "Needs Preparation" if overall >= 45 else
        "Not Ready"
    )

    # Gap topics only → Groq for action plans
    gap_topics = [h for h in heatmap if h["status"] in ("gap", "needs_work")]
    gap_plans = {"gap_plans": [], "next_session_focus": "", "overall_advice": ""}

    if gap_topics:
        try:
            gap_plans = call_groq(
                gap_plan_prompt(gap_topics, resume),
                model="llama-3.3-70b-versatile",
                max_tokens=1200
            )
        except Exception as e:
            print(f"Gap plan failed: {e}")

    summary = {
        "overall_score": overall,
        "performance_label": label,
        "heatmap": heatmap,
        "gap_plans": gap_plans.get("gap_plans", []),
        "next_session_focus": gap_plans.get("next_session_focus", ""),
        "overall_advice": gap_plans.get("overall_advice", ""),
        "total_questions": len(session_questions),
        "skipped": sum(1 for q in session_questions if q.get("skipped", False))
    }

    return jsonify(summary)


if __name__ == "__main__":
    app.run(debug=True, port=5000)
import hashlib
import io
import json
import os
import re
from datetime import datetime, timezone

import pdfplumber

from groq_client import call_groq, has_groq_key


DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
RESUME_DIR = os.path.join(DATA_DIR, "resumes")

SKILL_MASTER = {
    "languages": ["Python", "Java", "C++", "C", "JavaScript", "TypeScript", "Go", "Rust", "SQL", "R"],
    "frameworks": ["React", "Angular", "Vue", "Django", "Flask", "FastAPI", "Spring", "Express", "Next.js", "Node.js"],
    "tools": ["Git", "Docker", "Kubernetes", "Jenkins", "Postman", "JIRA", "Figma", "Linux"],
    "databases": ["MySQL", "PostgreSQL", "MongoDB", "Redis", "SQLite", "Cassandra", "Supabase"],
    "domains": ["Machine Learning", "Deep Learning", "NLP", "Computer Vision", "Data Analysis", "Web Development", "Cloud Computing", "DevOps", "Cybersecurity", "Blockchain"],
}

DEGREE_RE = re.compile(r"\b(B\.?Tech|B\.?E\.?|BCA|MCA|MBA|M\.?Tech|B\.?Sc|M\.?Sc|BBA)\b", re.I)
CGPA_RE = re.compile(r"\b([0-9]\.[0-9]{1,2})\s*(?:CGPA|GPA|CPI)?\b", re.I)
YEAR_RE = re.compile(r"\b(20[2-3][0-9])\b")


def resume_hash(file_bytes: bytes) -> str:
    return hashlib.md5(file_bytes).hexdigest()


def extract_text_from_pdf(file_bytes: bytes) -> str:
    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        return "\n".join(page.extract_text() or "" for page in pdf.pages).strip()


def parse_resume(file_bytes: bytes, filename: str = "resume.pdf") -> tuple[dict, bool]:
    rid = resume_hash(file_bytes)
    os.makedirs(RESUME_DIR, exist_ok=True)
    cached_path = os.path.join(RESUME_DIR, f"{rid}.json")
    if os.path.exists(cached_path):
        with open(cached_path, "r", encoding="utf-8") as f:
            return json.load(f), True

    raw_text = extract_text_from_pdf(file_bytes)
    if not raw_text:
        raw_text = filename.replace(".pdf", "").replace("_", " ")

    rule_data = rule_based_extract(raw_text)
    fuzzy = extract_fuzzy_with_groq(rule_data["_unparsed"], raw_text)
    final = merge_resume_data(rid, raw_text, rule_data, fuzzy)

    with open(cached_path, "w", encoding="utf-8") as f:
        json.dump(final, f, indent=2)
    return final, False


def rule_based_extract(text: str) -> dict:
    lines = [line.strip(" -•\t") for line in text.splitlines() if line.strip()]
    email = re.findall(r"[\w.-]+@[\w.-]+\.\w+", text)
    phone_matches = re.findall(r"(?:\+91[\s-]?)?[6-9]\d{9}", text)
    return {
        "personal": {
            "name": infer_name(lines, email),
            "email": email[0] if email else "",
            "phone": phone_matches[0] if phone_matches else "",
        },
        "education": extract_education(text),
        "skills": extract_skills(text),
        "certifications": extract_list_section(text, r"certifications?|achievements?"),
        "_unparsed": {
            "projects_raw": extract_section(text, r"projects?"),
            "experience_raw": extract_section(text, r"experience|work experience|internships?"),
        },
    }


def infer_name(lines: list[str], emails: list[str]) -> str:
    for line in lines[:8]:
        if "@" in line or len(line) > 60:
            continue
        if re.search(r"resume|curriculum|github|linkedin|portfolio", line, re.I):
            continue
        if re.search(r"[A-Za-z]{2,}\s+[A-Za-z]{2,}", line):
            return line.title()
    return emails[0].split("@")[0].replace(".", " ").title() if emails else "Candidate"


def extract_education(text: str) -> dict:
    degree = DEGREE_RE.search(text)
    cgpa = CGPA_RE.search(text)
    years = YEAR_RE.findall(text)
    branch_match = re.search(r"(Computer Science|Information Technology|Electronics|Mechanical|Civil|Electrical|Data Science|AI|Artificial Intelligence)", text, re.I)
    college_match = re.search(r"([A-Z][A-Za-z .&]+(?:College|University|Institute|IIT|NIT|IIIT)[A-Za-z .&]*)", text)
    return {
        "degree": degree.group(1).replace(" ", "") if degree else "",
        "branch": branch_match.group(1).title() if branch_match else "",
        "college": college_match.group(1).strip() if college_match else "",
        "year_of_passing": int(max(years)) if years else None,
        "cgpa": float(cgpa.group(1)) if cgpa else None,
    }


def extract_skills(text: str) -> dict:
    text_lower = text.lower()
    found = {}
    for category, skills in SKILL_MASTER.items():
        found[category] = sorted({skill for skill in skills if re.search(rf"\b{re.escape(skill.lower())}\b", text_lower)})
    return found


def extract_section(text: str, section_keyword: str) -> str:
    pattern = rf"(?is)(?:^|\n)\s*(?:{section_keyword})\s*:?\s*\n(.*?)(?=\n\s*(?:education|skills|certifications?|achievements?|experience|projects?|summary|contact)\s*:?\s*\n|\Z)"
    match = re.search(pattern, text)
    return match.group(1).strip() if match else ""


def extract_list_section(text: str, section_keyword: str) -> list[str]:
    raw = extract_section(text, section_keyword)
    return [line.strip(" -•\t") for line in raw.splitlines() if line.strip()][:8]


def extract_fuzzy_with_groq(unparsed: dict, raw_text: str) -> dict:
    if not has_groq_key():
        return local_fuzzy_extract(unparsed)

    prompt = f"""
Extract structured data for only these unstructured resume sections. Return JSON only.

Projects raw text:
{unparsed.get("projects_raw") or "N/A"}

Experience raw text:
{unparsed.get("experience_raw") or "N/A"}

Return:
{{
  "projects": [{{"name": "", "tech_stack": [], "description": "", "keywords": [], "complexity": "low|medium|high"}}],
  "experience": [{{"role": "", "company": "", "duration_months": 0, "description": "", "tech": []}}]
}}
"""
    try:
        return call_groq(prompt)
    except Exception:
        return local_fuzzy_extract(unparsed)


def local_fuzzy_extract(unparsed: dict) -> dict:
    projects = []
    raw_projects = unparsed.get("projects_raw", "")
    chunks = [chunk.strip(" -•\n") for chunk in re.split(r"\n(?=[A-Z][A-Za-z0-9 -]{3,40}:?)", raw_projects) if chunk.strip()]
    for chunk in chunks[:4]:
        first = chunk.splitlines()[0].strip(": -")
        skills = [s for group in SKILL_MASTER.values() for s in group if s.lower() in chunk.lower()]
        projects.append({
            "name": first[:60] or "Resume Project",
            "tech_stack": sorted(set(skills))[:8],
            "description": " ".join(chunk.split())[:180],
            "keywords": sorted(set(skills))[:6],
            "complexity": "medium" if len(skills) >= 3 else "low",
        })
    if not projects:
        projects = [{
            "name": "Resume Deep Dive",
            "tech_stack": [],
            "description": "Project details were limited in the uploaded resume.",
            "keywords": ["ownership", "tradeoffs", "impact"],
            "complexity": "medium",
        }]

    raw_exp = unparsed.get("experience_raw", "")
    experience = []
    if raw_exp:
        first = raw_exp.splitlines()[0].strip(" -•")
        experience.append({
            "role": first[:50] or "Intern",
            "company": "",
            "duration_months": 0,
            "description": " ".join(raw_exp.split())[:180],
            "tech": [s for group in SKILL_MASTER.values() for s in group if s.lower() in raw_exp.lower()][:6],
        })
    return {"projects": projects, "experience": experience}


def merge_resume_data(rid: str, raw_text: str, rule_data: dict, fuzzy_data: dict) -> dict:
    methods = {
        "name": "rule_based",
        "email": "rule_based",
        "phone": "rule_based",
        "skills": "rule_based",
        "education": "rule_based",
        "projects": "groq_llm" if has_groq_key() else "local_fallback",
        "experience": "groq_llm" if has_groq_key() else "local_fallback",
        "certifications": "rule_based",
    }
    return {
        "resume_id": rid,
        "parsed_at": datetime.now(timezone.utc).isoformat(),
        "parse_method": methods,
        "personal": rule_data["personal"],
        "education": rule_data["education"],
        "skills": rule_data["skills"],
        "projects": fuzzy_data.get("projects", []),
        "experience": fuzzy_data.get("experience", []),
        "certifications": rule_data["certifications"],
        "raw_text_length": len(raw_text),
        "confidence_score": estimate_confidence(rule_data, fuzzy_data),
    }


def estimate_confidence(rule_data: dict, fuzzy_data: dict) -> float:
    signals = [
        bool(rule_data["personal"].get("email")),
        bool(rule_data["skills"].get("languages") or rule_data["skills"].get("frameworks")),
        bool(rule_data["education"].get("degree")),
        bool(fuzzy_data.get("projects")),
    ]
    return round(0.55 + 0.1 * sum(signals), 2)

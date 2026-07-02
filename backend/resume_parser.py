"""
resume_parser.py
Rule-based resume extractor. No LLM calls here.
Handles 80%+ of fields deterministically.
"""
import re
import json
import os
from typing import Optional

# Load skills master list
_SKILLS_PATH = os.path.join(os.path.dirname(__file__), "data", "skills_master.json")
with open(_SKILLS_PATH) as f:
    SKILL_MASTER = json.load(f)

DEGREE_PATTERN = re.compile(
    r'\b(B\.?\s?Tech|B\.?\s?E\.?|BCA|BCS|BBA|B\.?\s?Sc|'
    r'M\.?\s?Tech|MCA|MBA|M\.?\s?Sc|M\.?\s?E\.?|'
    r'BE|BTech|MTech|PhD|B\.?Com|M\.?Com)\b',
    re.IGNORECASE
)

BRANCH_PATTERN = re.compile(
    r'\b(Computer Science|CSE|Information Technology|IT|'
    r'Electronics|ECE|Electrical|EEE|Mechanical|Civil|'
    r'Chemical|Data Science|AI|Artificial Intelligence|'
    r'Software Engineering|Cyber Security|Biotechnology)\b',
    re.IGNORECASE
)

CGPA_PATTERN = re.compile(
    r'\b(\d\.\d{1,2})\s*(?:CGPA|cgpa|GPA|gpa|CPI|cpi|\/10|out of 10)?\b'
)

YEAR_PATTERN = re.compile(r'\b(20\d{2})\b')

EMAIL_PATTERN = re.compile(r'[\w.+-]+@[\w-]+\.[a-zA-Z]{2,}')
PHONE_PATTERN = re.compile(r'(?:\+91[\s-]?)?[6-9]\d{9}')

SECTION_HEADERS = [
    "education", "skills", "technical skills", "projects", "project",
    "experience", "work experience", "internship", "internships",
    "certifications", "certificates", "achievements", "awards",
    "summary", "objective", "profile", "about"
]


def extract_sections(text: str) -> dict:
    """Split resume text into named sections."""
    lines = text.split('\n')
    sections = {}
    current_section = "header"
    current_lines = []

    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue
        lower = stripped.lower().rstrip(':').strip()
        if lower in SECTION_HEADERS and len(stripped) < 40:
            if current_lines:
                sections[current_section] = '\n'.join(current_lines)
            current_section = lower
            current_lines = []
        else:
            current_lines.append(stripped)

    if current_lines:
        sections[current_section] = '\n'.join(current_lines)
    return sections


def extract_personal(text: str, sections: dict) -> dict:
    header = sections.get("header", text[:300])
    lines = [l.strip() for l in header.split('\n') if l.strip()]

    name = ""
    for line in lines[:5]:
        # Name: likely first line that's not contact info
        if not re.search(r'[@|\d{8,}|http|linkedin|github]', line.lower()):
            if 2 <= len(line.split()) <= 5 and len(line) < 50:
                name = line
                break

    emails = EMAIL_PATTERN.findall(text)
    phones = PHONE_PATTERN.findall(text)

    # Extract GitHub/LinkedIn
    github = ""
    linkedin = ""
    gh_match = re.search(r'github\.com/[\w-]+', text, re.IGNORECASE)
    li_match = re.search(r'linkedin\.com/in/[\w-]+', text, re.IGNORECASE)
    if gh_match:
        github = gh_match.group()
    if li_match:
        linkedin = li_match.group()

    return {
        "name": name,
        "email": emails[0] if emails else "",
        "phone": phones[0] if phones else "",
        "github": github,
        "linkedin": linkedin
    }


def extract_education(text: str, sections: dict) -> dict:
    edu_text = sections.get("education", text)

    degree_match = DEGREE_PATTERN.search(edu_text)
    branch_match = BRANCH_PATTERN.search(edu_text)
    cgpa_match = CGPA_PATTERN.search(edu_text)
    years = YEAR_PATTERN.findall(edu_text)

    # Graduation year: take the latest year found in education section
    grad_year = None
    if years:
        year_ints = [int(y) for y in years if 2000 <= int(y) <= 2030]
        grad_year = max(year_ints) if year_ints else None

    # College name heuristic: line containing "university", "institute", "college", "iit", "nit"
    college = ""
    for line in edu_text.split('\n'):
        if re.search(r'\b(university|institute|college|iit|nit|iiit|bits|vit|srm)\b', line, re.IGNORECASE):
            college = line.strip()[:80]
            break

    return {
        "degree": degree_match.group() if degree_match else "",
        "branch": branch_match.group() if branch_match else "",
        "college": college,
        "cgpa": float(cgpa_match.group(1)) if cgpa_match else None,
        "year_of_passing": grad_year
    }


def extract_skills(text: str) -> dict:
    text_lower = text.lower()
    found = {}
    for category, skill_list in SKILL_MASTER.items():
        if category == "certifications_keywords":
            continue
        matched = []
        for skill in skill_list:
            # Word boundary match to avoid false positives (e.g., "C" in "React")
            pattern = r'\b' + re.escape(skill) + r'\b'
            if re.search(pattern, text, re.IGNORECASE):
                matched.append(skill)
        found[category] = matched
    return found


def extract_certifications(text: str) -> list:
    cert_keywords = SKILL_MASTER.get("certifications_keywords", [])
    found = []
    for kw in cert_keywords:
        if kw.lower() in text.lower():
            # Find full line
            for line in text.split('\n'):
                if kw.lower() in line.lower() and len(line.strip()) < 100:
                    found.append(line.strip())
                    break
    return list(set(found))


def get_unparsed_sections(sections: dict) -> dict:
    """Return raw text for fields that need LLM fix-up."""
    unparsed = {}

    project_keys = [k for k in sections if 'project' in k]
    exp_keys = [k for k in sections if k in ('experience', 'work experience', 'internship', 'internships')]

    projects_raw = '\n'.join([sections[k] for k in project_keys])
    experience_raw = '\n'.join([sections[k] for k in exp_keys])

    if projects_raw.strip():
        unparsed['projects_raw'] = projects_raw[:2000]  # cap tokens
    if experience_raw.strip():
        unparsed['experience_raw'] = experience_raw[:2000]

    return unparsed


def rule_based_extract(raw_text: str) -> dict:
    """Full rule-based extraction. Returns structured dict + _unparsed for LLM."""
    sections = extract_sections(raw_text)

    return {
        "personal": extract_personal(raw_text, sections),
        "education": extract_education(raw_text, sections),
        "skills": extract_skills(raw_text),
        "certifications": extract_certifications(raw_text),
        "projects": [],       # filled by LLM
        "experience": [],     # filled by LLM
        "_unparsed": get_unparsed_sections(sections),
        "_parse_method": {
            "personal": "rule_based",
            "education": "rule_based",
            "skills": "rule_based",
            "certifications": "rule_based",
            "projects": "pending_llm",
            "experience": "pending_llm"
        }
    }
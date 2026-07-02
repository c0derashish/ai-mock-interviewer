"""
prompts.py
All Groq prompt templates in one place.
Every prompt ends with "Return JSON only."
"""
import json


def fuzzy_parse_prompt(unparsed: dict) -> str:
    return f"""Extract structured data from these raw resume sections.

Projects raw text:
{unparsed.get('projects_raw', 'N/A')}

Experience/Internship raw text:
{unparsed.get('experience_raw', 'N/A')}

Return this exact JSON structure:
{{
  "projects": [
    {{
      "name": "project name",
      "tech_stack": ["tech1", "tech2"],
      "description": "one line description",
      "keywords": ["keyword1", "keyword2"],
      "complexity": "low|medium|high"
    }}
  ],
  "experience": [
    {{
      "role": "job title",
      "company": "company name",
      "duration_months": 0,
      "description": "one line of what they did",
      "tech": ["tech1", "tech2"]
    }}
  ]
}}

If no projects found, return empty array. If no experience, return empty array.
Return JSON only."""


def generate_question_prompt(resume: dict, config: dict, history: list) -> str:
    q_num = len([h for h in history if not h.get('is_followup', False)])
    total_q = config.get('total_questions', 10)

    if q_num < total_q * 0.3:
        focus = "resume-based"
        focus_note = "Ask about a SPECIFIC project or experience from the candidate's profile. Reference it by name."
    elif q_num < total_q * 0.7:
        focus = "technical"
        focus_note = "Ask a technical question matching the candidate's actual tech stack."
    else:
        focus = "behavioral"
        focus_note = "Ask a behavioral or situational question. Use STAR context."

    history_str = "\n".join([
        f"- [{h.get('topic', 'unknown')}]: {h.get('question', '')}"
        for h in history[-4:]
    ]) or "None yet."

    skills_flat = (
        resume.get('skills', {}).get('languages', []) +
        resume.get('skills', {}).get('frameworks', [])
    )

    projects_summary = [
        f"{p['name']} ({', '.join(p.get('tech_stack', [])[:3])})"
        for p in resume.get('projects', [])
    ]

    exp_summary = [
        f"{e.get('role', '')} at {e.get('company', '')}"
        for e in resume.get('experience', [])
    ]

    company_tone_instructions = {
        "Startup": "Be casual and direct. Focus on building fast, ownership, and scrappy solutions.",
        "Product MNC": "Be structured. Ask about tradeoffs, metrics, and scalability.",
        "Service MNC": "Focus on process, methodologies, SDLC, testing, and documentation.",
        "PSU": "Be formal. Ask domain-specific technical and process questions."
    }

    difficulty_instructions = {
        "Fresher": "Keep questions appropriate for a fresh graduate. Don't expect deep industry experience.",
        "Mid-Level": "Expect 1-3 years of experience. Ask deeper technical questions.",
        "Aggressive": "Be tough. Challenge assumptions. Ask about edge cases, failures, scale."
    }

    tone_note = company_tone_instructions.get(config.get('company_tone', 'Product MNC'), "")
    diff_note = difficulty_instructions.get(config.get('difficulty', 'Fresher'), "")

    return f"""You are a {config.get('company_tone', 'Product MNC')} interviewer hiring for {config.get('role', 'Software Engineer')}.

{tone_note}
{diff_note}

Candidate profile:
- Name: {resume.get('personal', {}).get('name', 'Candidate')}
- Education: {resume.get('education', {}).get('degree', '')} in {resume.get('education', {}).get('branch', '')} from {resume.get('education', {}).get('college', '')}
- Tech skills: {', '.join(skills_flat[:12])}
- Projects: {', '.join(projects_summary) or 'None listed'}
- Experience: {', '.join(exp_summary) or 'No experience yet'}

Question focus: {focus}
Instruction: {focus_note}

Topics already covered (avoid repetition):
{history_str}

Generate ONE interview question. Return this exact JSON:
{{
  "question": "the full question text",
  "type": "technical|behavioral|situational|resume-based",
  "topic": "single topic tag (e.g. React, System Design, Teamwork)",
  "expected_keywords": ["3 to 6 keywords a strong answer should mention"],
  "hint_for_scorer": "what a complete answer covers in 1-2 sentences"
}}

Return JSON only."""


def score_answer_prompt(question_data: dict, user_answer: str, resume: dict) -> str:
    skills_flat = (
        resume.get('skills', {}).get('languages', []) +
        resume.get('skills', {}).get('frameworks', [])
    )

    return f"""You are scoring a placement mock interview answer. Be honest and specific.

Question: {question_data.get('question', '')}
Topic: {question_data.get('topic', '')}
Type: {question_data.get('type', '')}
Expected keywords/concepts: {question_data.get('expected_keywords', [])}
What a complete answer covers: {question_data.get('hint_for_scorer', '')}

Candidate's tech stack: {skills_flat[:8]}
Candidate's answer: "{user_answer}"

Score this answer with this rubric:
- 1-3: Wrong, missing, or no answer
- 4-5: Partial — missing key concepts
- 6-7: Good but lacks depth or specifics
- 8-9: Strong, covers main points well
- 10: Exceptional, handles edge cases

Return this exact JSON:
{{
  "llm_score": <integer 1-10>,
  "strengths": ["specific strength 1", "specific strength 2"],
  "gaps": ["specific missing point 1", "specific missing point 2"],
  "ideal_hint": "one sentence on what would make this a 9-10 answer",
  "follow_up_question": "a probing follow-up question OR null if score >= 8",
  "follow_up_depth": "why this follow-up tests a gap in their answer"
}}

Return JSON only."""


def generate_followup_score_prompt(followup_q: str, user_answer: str, parent_topic: str) -> str:
    return f"""Score this follow-up interview answer.

Follow-up question: {followup_q}
Topic context: {parent_topic}
Candidate's answer: "{user_answer}"

Return this exact JSON:
{{
  "llm_score": <integer 1-10>,
  "strengths": ["point 1"],
  "gaps": ["gap 1"],
  "ideal_hint": "one sentence improvement direction"
}}

Return JSON only."""


def gap_plan_prompt(topic_gaps: list, resume: dict) -> str:
    skills_flat = (
        resume.get('skills', {}).get('languages', []) +
        resume.get('skills', {}).get('frameworks', []) +
        resume.get('skills', {}).get('domains', [])
    )

    return f"""Indian placement preparation context. A student just completed a mock interview.

Their weak topics (score < 6.5):
{json.dumps(topic_gaps, indent=2)}

Their current tech stack: {skills_flat[:10]}
Their projects: {[p.get('name', '') for p in resume.get('projects', [])]}

For each weak topic, give a specific, actionable improvement plan. Return this exact JSON:
{{
  "gap_plans": [
    {{
      "topic": "topic name",
      "core_concept_missing": "what fundamental concept they're missing",
      "fix_in": "realistic time estimate like 2 days or 1 week",
      "practice_resource": "specific resource: exact LeetCode tag / GFG article / YouTube channel name",
      "resume_angle": "how to demonstrate this skill in resume or future interviews"
    }}
  ],
  "next_session_focus": "single sentence on what to practice next mock",
  "overall_advice": "2 honest, specific sentences for this particular student"
}}

Return JSON only."""


def reeval_answer_prompt(question_data: dict, user_answer: str) -> str:
    """Used for 'Challenge Me' re-evaluation with a generous rubric."""
    return f"""Re-evaluate this interview answer with a more generous rubric.
Look for partial credit, correct intent even if terminology is off, and practical knowledge.

Question: {question_data.get('question', '')}
Topic: {question_data.get('topic', '')}
Expected keywords: {question_data.get('expected_keywords', [])}
Candidate's answer: "{user_answer}"

Generous rubric:
- Give credit for correct intent even if phrasing is informal
- Partial concepts deserve partial credit
- Real-world practical knowledge counts even without textbook terms

Return this exact JSON:
{{
  "reeval_score": <integer 1-10>,
  "why_higher": "specific reason if score is higher than before",
  "verdict": "Fair|You deserved more|Original score was right"
}}

Return JSON only."""
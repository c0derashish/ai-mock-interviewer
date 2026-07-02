import json


def question_prompt(resume: dict, config: dict, history: list[dict]) -> str:
    q_num = len([h for h in history if not h.get("is_followup")])
    total = int(config.get("total_questions", 10))
    if q_num < total * 0.3:
        focus = "resume-based"
    elif q_num < total * 0.7:
        focus = "technical"
    else:
        focus = "behavioral|situational"

    recent = "\n".join(f"Q{i + 1} [{h.get('topic')}]: {h.get('question')}" for i, h in enumerate(history[-3:]))
    return f"""
You are a {config.get('tone', 'Product MNC')} {config.get('role', 'Software Engineer')} interviewer.
Difficulty: {config.get('difficulty', 'Fresher')}.
Question focus this turn: {focus}

Candidate profile:
- Skills: {json.dumps(resume.get('skills', {}))}
- Projects: {json.dumps([(p.get('name'), p.get('tech_stack')) for p in resume.get('projects', [])])}
- Education: {json.dumps(resume.get('education', {}))}
- Experience: {json.dumps([(e.get('role'), e.get('company')) for e in resume.get('experience', [])])}

Questions already asked. Do not repeat topic:
{recent or 'None'}

Generate one interview question. Return JSON only:
{{
  "question": "",
  "type": "technical|behavioral|situational|resume-based",
  "topic": "",
  "expected_keywords": ["3-6 concrete keywords"],
  "hint_for_scorer": "what a strong answer covers"
}}
"""


def scoring_prompt(question: dict, answer: str, resume: dict) -> str:
    return f"""
You are scoring a placement interview answer for an Indian student.

Question: {question.get('question')}
Topic: {question.get('topic')}
Type: {question.get('type')}
Expected coverage: {question.get('expected_keywords', [])}

Candidate profile:
- Skills: {json.dumps(resume.get('skills', {}))}
- Projects: {json.dumps([p.get('name') for p in resume.get('projects', [])])}

Candidate answer: {answer}

Return JSON only:
{{
  "llm_score": 1,
  "strengths": ["specific point"],
  "gaps": ["specific missing point"],
  "ideal_hint": "one sentence direction, not a full answer",
  "follow_up_question": "follow-up or null if score >= 8",
  "follow_up_depth": "why this probes the gap"
}}

Rubric: 1-3 wrong/no answer, 4-5 partial, 6-7 good but shallow, 8-9 strong, 10 exceptional with tradeoffs and edge cases.
"""


def gap_plan_prompt(topic_gaps: list[dict], resume: dict) -> str:
    return f"""
Indian placement context. Student has these weak interview topics:
{json.dumps(topic_gaps, indent=2)}

Student tech stack: {json.dumps(resume.get('skills', {}))}

For each gap topic, give a specific action. Return JSON only:
{{
  "gap_plans": [
    {{
      "topic": "",
      "core_concept_missing": "",
      "fix_in": "2 days / 1 week",
      "practice_resource": "specific resource",
      "resume_angle": "how to show this skill in interview"
    }}
  ],
  "next_session_focus": "single sentence",
  "overall_advice": "two concise lines"
}}
"""

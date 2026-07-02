import re


def hybrid_score(question_data: dict, user_answer: str, llm_score: float) -> tuple[float, dict]:
    expected = question_data.get("expected_keywords", []) or []
    answer_lower = user_answer.lower()
    matched = [kw for kw in expected if re.search(rf"\b{re.escape(str(kw).lower())}\b", answer_lower)]
    coverage = len(matched) / len(expected) if expected else 0.5
    keyword_score = coverage * 10
    final = round(0.3 * keyword_score + 0.7 * float(llm_score), 1)
    return min(10, max(0, final)), {
        "matched_keywords": matched,
        "expected_count": len(expected),
        "keyword_coverage": round(coverage, 2),
        "keyword_score": round(keyword_score, 1),
    }


def local_score(question_data: dict, answer: str) -> dict:
    clean = answer.strip()
    word_count = len(clean.split())
    expected = question_data.get("expected_keywords", []) or []
    matched = [kw for kw in expected if str(kw).lower() in clean.lower()]
    base = 2 if word_count < 12 else 5 if word_count < 45 else 7
    bonus = min(2, len(matched) * 0.7)
    score = min(9, round(base + bonus))
    gaps = []
    missing = [kw for kw in expected if kw not in matched]
    if missing:
        gaps.append(f"Did not clearly cover: {', '.join(map(str, missing[:3]))}.")
    if word_count < 45:
        gaps.append("Answer needs more structure, examples, and tradeoff reasoning.")
    return {
        "llm_score": score,
        "strengths": ["Touched the core topic." if matched else "Attempted the question honestly."],
        "gaps": gaps or ["Add one concrete metric or edge case to make this stronger."],
        "ideal_hint": "Use a crisp structure: context, approach, tradeoff, result.",
        "follow_up_question": None if score >= 8 else f"Can you go deeper on {question_data.get('topic', 'this topic')} with one concrete example?",
        "follow_up_depth": "Checks whether the candidate can move from surface explanation to applied reasoning.",
    }

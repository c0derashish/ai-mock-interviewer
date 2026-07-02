"""
scorer.py
Hybrid scoring: 30% keyword coverage (deterministic) + 70% LLM judgment.
Produces consistent, explainable scores.
"""
import re


def keyword_coverage(user_answer: str, expected_keywords: list) -> dict:
    """
    Deterministic keyword check.
    Returns coverage ratio and matched/unmatched lists.
    """
    if not expected_keywords:
        return {"ratio": 0.5, "matched": [], "unmatched": [], "total": 0}

    answer_lower = user_answer.lower()
    matched = []
    unmatched = []

    for kw in expected_keywords:
        # Flexible match: allow partial word forms
        pattern = r'\b' + re.escape(kw.lower())
        if re.search(pattern, answer_lower):
            matched.append(kw)
        else:
            unmatched.append(kw)

    ratio = len(matched) / len(expected_keywords)
    return {
        "ratio": ratio,
        "matched": matched,
        "unmatched": unmatched,
        "total": len(expected_keywords)
    }


def compute_hybrid_score(llm_score: int, kw_ratio: float) -> float:
    """
    Blend keyword coverage (30%) + LLM judgment (70%).
    Keyword score anchors consistency; LLM provides nuanced judgment.
    """
    kw_score = kw_ratio * 10
    blended = 0.3 * kw_score + 0.7 * llm_score
    return round(min(10.0, max(1.0, blended)), 1)


def build_score_result(question_data: dict, user_answer: str, llm_result: dict) -> dict:
    """
    Merge LLM result + keyword analysis into final score object.
    """
    expected_kw = question_data.get("expected_keywords", [])
    kw_result = keyword_coverage(user_answer, expected_kw)

    llm_score = llm_result.get("llm_score", 5)
    final_score = compute_hybrid_score(llm_score, kw_result["ratio"])

    return {
        "final_score": final_score,
        "llm_score": llm_score,
        "keyword_coverage": {
            "matched": kw_result["matched"],
            "unmatched": kw_result["unmatched"],
            "ratio": round(kw_result["ratio"], 2),
            "display": f"{len(kw_result['matched'])}/{kw_result['total']} expected terms"
        },
        "strengths": llm_result.get("strengths", []),
        "gaps": llm_result.get("gaps", []),
        "ideal_hint": llm_result.get("ideal_hint", ""),
        "follow_up_question": llm_result.get("follow_up_question"),
        "follow_up_depth": llm_result.get("follow_up_depth", "")
    }
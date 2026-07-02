"""
groq_client.py
Single wrapper for all Groq API calls.
Always returns parsed dict. All prompts must instruct JSON-only output.
"""
import json
import re
import os
from groq import Groq

_client = None


def get_client() -> Groq:
    global _client
    if _client is None:
        api_key = os.environ.get("GROQ_API_KEY")
        if not api_key:
            raise ValueError("GROQ_API_KEY not set in environment")
        _client = Groq(api_key=api_key)
    return _client


def call_groq(prompt: str, model: str = "llama-3.3-70b-versatile", max_tokens: int = 1000) -> dict:
    """
    Single entry point for all Groq calls.
    - model: use llama-3.3-70b-versatile for generation, llama-3.1-8b-instant for scoring
    - Always returns parsed dict
    """
    client = get_client()

    response = client.chat.completions.create(
        model=model,
        messages=[
            {
                "role": "system",
                "content": "You are a precise JSON generator. Always respond with valid JSON only. No markdown, no explanation, no code fences."
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        temperature=0.4,
        max_tokens=max_tokens,
    )

    text = response.choices[0].message.content.strip()

    # Strip any accidental markdown fences
    text = re.sub(r'```json\s*', '', text)
    text = re.sub(r'```\s*', '', text)
    text = text.strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        # Try to extract first JSON object
        match = re.search(r'\{.*\}', text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group())
            except json.JSONDecodeError:
                pass
        raise ValueError(f"Groq returned non-JSON response: {text[:300]}")
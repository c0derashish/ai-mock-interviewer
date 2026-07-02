import json
import os
import re

try:
    from groq import Groq
except ImportError:  # Keeps local demo mode usable before dependencies install.
    Groq = None


def has_groq_key() -> bool:
    return bool(os.getenv("GROQ_API_KEY")) and Groq is not None


def call_groq(prompt: str, model: str = "llama-3.3-70b-versatile") -> dict:
    if not has_groq_key():
        raise RuntimeError("GROQ_API_KEY is not configured")

    client = Groq(api_key=os.environ["GROQ_API_KEY"])
    response = client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.35,
        max_tokens=1100,
    )
    text = response.choices[0].message.content.strip()
    text = re.sub(r"```json|```", "", text).strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if match:
            return json.loads(match.group())
        raise ValueError(f"Groq returned non-JSON: {text[:200]}")

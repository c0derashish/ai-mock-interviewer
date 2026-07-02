"""
groq_client.py
Single wrapper for all Groq API calls through LangChain.
Always returns parsed dict. All prompts must instruct JSON-only output.
"""
import json
import os
import re

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_groq import ChatGroq


def call_groq(prompt: str, model: str = "llama-3.3-70b-versatile", max_tokens: int = 1000) -> dict:
    """
    Single entry point for all LangChain/Groq calls.
    - model: use llama-3.3-70b-versatile for generation, llama-3.1-8b-instant for scoring
    - Always returns parsed dict
    """
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        raise ValueError("GROQ_API_KEY not set in environment")

    llm = ChatGroq(
        model=model,
        temperature=0.4,
        max_tokens=max_tokens,
    )

    response = llm.invoke([
        SystemMessage(content="You are a precise JSON generator. Always respond with valid JSON only. No markdown, no explanation, no code fences."),
        HumanMessage(content=prompt),
    ])

    text = response.content.strip()

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

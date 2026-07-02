# AI Mock Interviewer

> An interviewer that read your resume once, stored it, and never forgets it — asks questions about your actual projects, not generic ones.

Built for Indian placement prep. Zero paid APIs. Resume-aware questions, hybrid scoring, follow-up logic, skill heatmap.

---

## What makes this different

| Feature | This project | Generic mock tools |
|---|---|---|
| Question source | Your actual resume + projects | Static question bank |
| Resume parsing | Rule-based first, LLM only for fuzzy fields | LLM every time |
| Resume persistence | Parsed once, stored as JSON, reused | Re-parsed each session |
| Scoring | Keyword coverage + LLM blend (consistent) | Pure LLM (inconsistent) |
| Follow-ups | 2-level deep, score-gated | None |
| Interviewer persona | Startup / Product MNC / Service MNC / PSU | None |
| Cost | ₹0 (Groq free tier) | Paid |

---

## Tech Stack

| Backend | Frontend |
|---|---|
|Flask | React 18 + Vite |
|pdfplumber | Tailwind CSS |
| LangChain (`langchain-groq`) | useReducer (no Redux) |
|Groq API `llama-3.3-70b-versatile` `llama-3.1-8b-instant` | JetBrains Mono + Inter |
| | localStorage (resume cache) |
| | JSON file store |

**Why Groq:** ~300 tok/s inference. Interview needs burst speed. Free tier: 30 RPM, 14,400 req/day.

**Why LangChain:** The backend routes all model calls through LangChain's `ChatGroq` wrapper in `backend/groq_client.py`. This keeps the rest of the app on one stable `call_groq()` function while making the LLM provider layer easier to swap, trace, or extend later.

**Why not LLM-first parsing:** Regex finds email, phone, degree, skills instantly. No API cost, no hallucination risk. LLM only fixes projects + experience (free text, hard to regex).

---

## File Structure

```
ai-mock-interviewer/
│
├── backend/
│   ├── app.py                   # Flask routes — thin, delegates to modules
│   ├── groq_client.py           # Single LangChain ChatGroq wrapper (all calls go here)
│   ├── resume_parser.py         # Rule-based extraction — zero LLM
│   ├── prompts.py               # All prompt templates in one file
│   ├── scorer.py                # Hybrid scoring: 30% keyword + 70% LLM
│   ├── session_manager.py       # Session CRUD (flat JSON files)
│   ├── requirements.txt
│   └── data/
│       ├── skills_master.json   # 400-skill lookup (languages, frameworks, tools...)
│       ├── resumes/             # {md5_hash}.json — persisted per resume
│       └── sessions/            # {session_id}.json — interview logs
│
└── frontend/
    ├── index.html
    ├── package.json
    ├── vite.config.js           # Proxy /api → Flask :5000
    ├── tailwind.config.js       # Custom tokens: bg, surface, accent, success, danger
    ├── postcss.config.js
    └── src/
        ├── main.jsx
        ├── App.jsx              # Phase router: setup → interview → summary
        ├── index.css            # Tailwind + component classes
        ├── api.js               # All fetch wrappers (one per Flask route)
        │
        ├── pages/
        │   ├── Setup.jsx        # Resume upload + role/difficulty/tone config
        │   ├── Interview.jsx    # Q&A room: question card, answer box, timer, feedback
        │   └── Summary.jsx      # Score card, heatmap, gap plans, answer log
        │
        ├── components/
        │   ├── ResumePreview.jsx    # Parsed data with rule/LLM method tags + edit
        │   ├── QuestionCard.jsx     # Question + type/topic tags
        │   ├── FeedbackWidget.jsx   # Score, strengths, gaps, follow-up, challenge-me
        │   ├── ScoreBar.jsx         # Animated fill bar
        │   ├── HeatmapTable.jsx     # Color-coded topic breakdown
        │   ├── GapPlanCard.jsx      # Per-topic improvement plan
        │   └── Timer.jsx            # Countdown with drain bar
        │
        ├── hooks/
        │   ├── useSession.js    # useReducer state machine (all interview state)
        │   ├── useTimer.js      # Countdown timer with expiry callback
        │   └── useResume.js     # localStorage hash check + cache logic
        │
        └── utils/
            ├── heatmap.js       # statusColor, statusBg, scoreToStatus (local compute)
            └── export.js        # Download session as JSON
```

---

## Architecture

```
Browser (React)
    │
    ├─ localStorage: resume_hash, config, session phase
    │
    └─ HTTPS → Flask API
                   │
                   ├─ /parse-resume
                   │    ├─ pdfplumber → raw text
                   │    ├─ rule_based_extract() → 80% fields
                   │    ├─ call_groq() via LangChain ChatGroq → projects + experience only
                   │    └─ save data/resumes/{hash}.json
                   │
                   ├─ /resume/:hash  → serve cached JSON
                   │
                   ├─ /generate-question
                   │    ├─ load resume from disk (no re-parse)
                   │    ├─ build prompt: resume + history + config
                   │    └─ LangChain ChatGroq llama-3.3-70b-versatile → question JSON
                   │
                   ├─ /score-answer
                   │    ├─ keyword_coverage() → deterministic ratio
                   │    ├─ LangChain ChatGroq llama-3.1-8b-instant → llm_score + feedback
                   │    └─ final = 0.3*kw + 0.7*llm
                   │
                   └─ /generate-summary
                        ├─ compute heatmap locally (pure math)
                        └─ LangChain ChatGroq llama-3.3-70b-versatile → gap action plans only
```

---

## Resume Pipeline

```
PDF upload
    │
    ▼ pdfplumber (always, no API)
    │
    ▼ Rule-based extractor
      • Name      → first clean line heuristic
      • Email     → regex [\w.+-]+@[\w-]+\.\w+
      • Phone     → regex [6-9]\d{9} (Indian format)
      • Skills    → keyword match vs 400-skill master list
      • Education → degree/branch/CGPA regex + college heuristic
      • Certs     → keyword match
    │
    ▼ Identify unparsed fields
      → projects_raw (free text)
      → experience_raw (varied formats)
    │
    ▼ LangChain ChatGroq fix-up (1 call, minimal tokens)
      → structured projects + experience JSON
    │
    ▼ Merge → Final Resume JSON
    │
    ▼ Save: data/resumes/{md5}.json
      Send hash to browser localStorage
      ↓
      Next visit: hash found → GET /resume/:hash → skip all parsing
```

---

## Scoring Logic

Not pure LLM (inconsistent). Hybrid:

```python
keyword_coverage = matched_keywords / total_expected_keywords
kw_score         = keyword_coverage * 10
final_score      = 0.3 * kw_score + 0.7 * llm_score
```

UI shows `"3/5 expected terms found"` — tangible, not a black box.

Model split:
- `llama-3.3-70b-versatile-versatile` → question generation, summary (quality matters)
- `llama-3.1-8b-instant` → scoring (speed matters, lower stakes)

---

## Session State Machine

```
setup
  │ START_INTERVIEW
  ▼
interview
  │
  ├─ QUESTION_RECEIVED
  ├─ ANSWER_SUBMITTED → SCORE_RECEIVED
  │     │
  │     ├─ score < 8 + depth==0 → TRIGGER_FOLLOWUP
  │     │       → QUESTION_RECEIVED (is_followup=true)
  │     │       → SCORE_RECEIVED (depth=1, no more follow-up)
  │     │
  │     └─ consecutive_low >= 3 → drift_detected → force easy next Q
  │
  └─ END_INTERVIEW
        │ SUMMARY_RECEIVED
        ▼
      summary
```

State lives in `useReducer`. No Redux, no Zustand, no context hell.

---

## Groq Rate Limits (Free Tier)

| Action | Model | Calls/session |
|---|---|---|
| Resume fuzzy parse | llama-3.3-70b-versatile | 0–1 (cached after first) |
| Question generate ×10 | llama-3.3-70b-versatile | 10 |
| Score answer ×10 | llama-3.1-8b-instant | 10 |
| Score follow-up ×3 | llama-3.1-8b-instant | 0–3 |
| Gap plan (summary) | llama-3.3-70b-versatile | 1 |
| **Total** | | **~22–25 calls** |

Free tier: 30 RPM. Full session under 1 min of API time. Returning user (cached resume): saves 1 call + ~600 tokens.

---

## Setup

### Prerequisites
- Python 3.10+
- Node.js 18+
- Groq API key (free at [console.groq.com](https://console.groq.com))

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Create .env
echo "GROQ_API_KEY=your_key_here" > .env

python app.py
# Flask running on http://localhost:5000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# Vite running on http://localhost:5173
```

Open `http://localhost:5173`

---

## Environment Variables

```bash
# backend/.env
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxx
```

No other secrets needed. No database. No auth.

---

## Key Design Decisions (for portfolio reviewers)

**1. Regex before LLM**
Email, phone, degree, skills extracted with regex. LLM only gets the sections it can't handle (projects, experience free text). This cuts API usage by ~60% and eliminates hallucination risk on structured fields.

**2. Hash-based resume caching**
MD5 of PDF bytes → filename. Same PDF = instant cache hit, zero re-parse. Returning user starts interview in seconds. Demonstrates data design thinking, not just prompt engineering.

**3. Hybrid scoring formula**
`final = 0.3 * keyword_coverage + 0.7 * llm_score`. Keyword ratio anchors consistency; LLM adds nuance. Pure LLM scoring drifts ±2 points on identical answers.

**4. Task-appropriate model selection**
`llama-3.3-70b-versatile` where quality matters (questions, summary). `llama-3.1-8b-instant` where speed matters (scoring per answer). Shows cost awareness interviewers look for.

**5. useReducer state machine**
All interview state in one reducer. Phase transitions are explicit actions, not scattered setState calls. Predictable, debuggable, no race conditions.

**6. Parse method transparency**
UI shows green `rule` / blue `llm` tags per field. Hover to see which extraction method ran. Builds trust + shows the system's own awareness of its confidence.

---

## Features

- **Resume-anchored questions** — references your actual project names and tech
- **Interviewer personas** — Startup / Product MNC / Service MNC / PSU reshape every prompt
- **Follow-up logic** — score < 8 triggers one follow-up per question (2-level max)
- **Drift detection** — 3 consecutive low scores → system inserts easier confidence-builder question
- **Silence penalty** — optional: timer expires → auto-score 0 (simulates real pressure)
- **Challenge Me** — re-evaluates your answer with a generous rubric, shows delta
- **Skill heatmap** — topic breakdown computed locally, no LLM needed
- **Gap action plan** — 1 Groq call → specific resources, time estimates, resume angles
- **Session export** — full JSON download with all Q&A, scores, and feedback
- **Returning user UX** — "Resume on file: Ravi Kumar · parsed 1 Jul" — one-click resume

---

## Roadmap

- [ ] Voice input via Web Speech API (browser-native, free)
- [ ] Supabase: persist sessions across devices, track improvement over time
- [ ] Career Mirror integration: pull resume JSON from platform directly
- [ ] Resume diff: show what changed vs previous version
- [ ] Hindi language mode (Groq supports multilingual)
- [ ] Peer percentile: anonymized score comparison by role + college tier

---

## Demo Script (2.5 min)

1. Upload resume → skill tags appear instantly, no API call — *wow #1*
2. Reload page → "Resume on file" banner, skip upload entirely — *wow #2*
3. Start interview → first question references your actual project by name — *wow #3*
4. Submit weak answer → see `3/5 expected terms found` + specific gap — *wow #4*
5. Summary → heatmap computed locally, gap plan from single Groq call — *wow #5*

---

*Built by Ashish. Stack: Flask · LangChain · Groq · pdfplumber · React · Vite · Tailwind*

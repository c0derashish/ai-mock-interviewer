const BASE = ''  // proxied via vite

async function post(path, body) {
  const res = await fetch(BASE + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || `HTTP ${res.status}`)
  }
  return res.json()
}

async function get(path) {
  const res = await fetch(BASE + path)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || `HTTP ${res.status}`)
  }
  return res.json()
}

export async function parseResume(file) {
  const form = new FormData()
  form.append('resume', file)
  const res = await fetch('/parse-resume', { method: 'POST', body: form })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || 'Parse failed')
  }
  return res.json()
}

export const getResume = (hash) => get(`/resume/${hash}`)

export const updateResume = (hash, data) =>
  fetch(`/resume/${hash}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(r => r.json())

export const createSession = (resumeHash, config) =>
  post('/session/create', { resume_hash: resumeHash, config })

export const generateQuestion = (resumeHash, config, history) =>
  post('/generate-question', { resume_hash: resumeHash, config, history })

export const scoreAnswer = (questionData, userAnswer, resumeHash, isFollowup = false) =>
  post('/score-answer', {
    question_data: questionData,
    user_answer: userAnswer,
    resume_hash: resumeHash,
    is_followup: isFollowup
  })

export const reevalAnswer = (questionData, userAnswer, originalScore) =>
  post('/reeval-answer', {
    question_data: questionData,
    user_answer: userAnswer,
    original_score: originalScore
  })

export const generateSummary = (questions, resumeHash) =>
  post('/generate-summary', { questions, resume_hash: resumeHash })
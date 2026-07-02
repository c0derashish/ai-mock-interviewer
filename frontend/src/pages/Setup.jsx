import { useState, useRef } from 'react'
import { parseResume, updateResume } from '../api'
import { useResume } from '../hooks/useResume'
import ResumePreview from '../components/ResumePreview'

const ROLES = ['Software Engineer', 'Data Analyst', 'Product Manager', 'Core / Domain', 'HR / Behavioral Only']
const DIFFICULTIES = ['Fresher', 'Mid-Level', 'Aggressive']
const MODES = [
  { label: 'Quick', value: 'Quick', questions: 5 },
  { label: 'Standard', value: 'Standard', questions: 10 },
  { label: 'Deep Dive', value: 'Deep Dive', questions: 15 },
]
const TONES = ['Startup', 'Product MNC', 'Service MNC', 'PSU']
const TIMERS = [
  { label: '60s', value: 60 },
  { label: '90s', value: 90 },
  { label: '2 min', value: 120 },
  { label: 'No limit', value: 0 },
]

export default function Setup({ session, onStart }) {
  const { cachedHash, cachedName, cachedDate, cachedData, loading: cacheLoading, saveToCache, clearCache } = useResume()
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState(null)
  const [resumeData, setResumeData] = useState(null)
  const [resumeHash, setResumeHash] = useState(null)
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef(null)

  const [role, setRole] = useState('Software Engineer')
  const [difficulty, setDifficulty] = useState('Fresher')
  const [mode, setMode] = useState('Standard')
  const [tone, setTone] = useState('Product MNC')
  const [timerSeconds, setTimerSeconds] = useState(90)

  // Use cached resume if available
  const activeHash = resumeHash || cachedHash
  const activeData = resumeData || cachedData
  const ready = !!activeHash && !!activeData

  async function handleFile(file) {
    if (!file || file.type !== 'application/pdf') {
      setUploadError('Please upload a PDF file.')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setUploadError('File too large. Max 2MB.')
      return
    }
    setUploadError(null)
    setUploading(true)
    try {
      const result = await parseResume(file)
      setResumeHash(result.resume_id)
      setResumeData(result.data)
      saveToCache(result.resume_id, result.data)
    } catch (e) {
      setUploadError(e.message || 'Failed to parse resume')
    } finally {
      setUploading(false)
    }
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    handleFile(file)
  }

  async function handleSaveEdit(updated) {
    if (activeHash) {
      await updateResume(activeHash, updated)
      setResumeData(updated)
      saveToCache(activeHash, updated)
    }
  }

  function handleStart() {
    const modeObj = MODES.find(m => m.value === mode) || MODES[1]
    onStart({
      resumeHash: activeHash,
      resumeData: activeData,
      config: {
        role,
        difficulty,
        mode,
        company_tone: tone,
        total_questions: modeObj.questions,
        timer_seconds: timerSeconds,
      }
    })
  }

  if (cacheLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-text-dim font-mono text-sm">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          <span className="text-xs font-mono text-text-dim uppercase tracking-widest">AI Mock Interviewer</span>
        </div>
        <h1 className="text-3xl font-bold text-text">
          Your resume. Your questions.<br />
          <span className="text-accent">No generic prep.</span>
        </h1>
        <p className="text-text-dim mt-2 text-sm max-w-lg">
          Upload once. Questions are generated from your actual projects and tech stack, not a static bank.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Resume */}
        <div className="space-y-4">
          <h2 className="text-sm font-mono text-text-dim uppercase tracking-wider">Resume</h2>

          {/* Cached resume banner */}
          {cachedHash && !resumeData && (
            <div className="flex items-center justify-between bg-accent/10 border border-accent/30 rounded-xl px-4 py-3">
              <div>
                <p className="text-sm font-medium text-text">Resume on file</p>
                <p className="text-xs text-text-dim font-mono">{cachedName} · parsed {cachedDate}</p>
              </div>
              <button
                onClick={clearCache}
                className="text-xs text-text-dim hover:text-danger font-mono"
              >
                Remove
              </button>
            </div>
          )}

          {/* Upload zone */}
          {!activeHash && (
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-200
                ${dragging ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/50 hover:bg-surface'}`}
            >
              <input
                ref={fileRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={e => handleFile(e.target.files[0])}
              />
              {uploading ? (
                <div className="space-y-2">
                  <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-sm text-text-dim font-mono">Parsing resume...</p>
                </div>
              ) : (
                <>
                  <p className="text-2xl mb-2">📄</p>
                  <p className="text-sm text-text font-medium">Drop your resume PDF here</p>
                  <p className="text-xs text-text-dim mt-1">or click to browse · max 2MB</p>
                </>
              )}
            </div>
          )}

          {uploadError && (
            <p className="text-xs text-danger font-mono">{uploadError}</p>
          )}

          {/* Resume preview */}
          {activeData && <ResumePreview data={activeData} onSave={handleSaveEdit} />}

          {activeHash && !resumeData && (
            <button
              onClick={() => { clearCache(); setResumeHash(null); setResumeData(null) }}
              className="text-xs text-text-dim hover:text-accent font-mono underline"
            >
              Upload different resume
            </button>
          )}
        </div>

        {/* Right: Config */}
        <div className="space-y-6">
          <h2 className="text-sm font-mono text-text-dim uppercase tracking-wider">Interview Setup</h2>

          {/* Role */}
          <div className="space-y-2">
            <label className="text-xs font-mono text-text-dim">Target Role</label>
            <div className="grid grid-cols-1 gap-1.5">
              {ROLES.map(r => (
                <button
                  key={r}
                  onClick={() => setRole(r)}
                  className={`text-left px-4 py-2.5 rounded-lg border text-sm transition-all
                    ${role === r
                      ? 'border-accent bg-accent/10 text-text'
                      : 'border-border hover:border-accent/40 text-text-dim'}`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty */}
          <div className="space-y-2">
            <label className="text-xs font-mono text-text-dim">Difficulty</label>
            <div className="flex gap-2">
              {DIFFICULTIES.map(d => (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  className={`flex-1 px-3 py-2 rounded-lg border text-xs font-mono transition-all
                    ${difficulty === d
                      ? 'border-accent bg-accent/10 text-text'
                      : 'border-border hover:border-accent/40 text-text-dim'}`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Mode */}
          <div className="space-y-2">
            <label className="text-xs font-mono text-text-dim">Interview Length</label>
            <div className="flex gap-2">
              {MODES.map(m => (
                <button
                  key={m.value}
                  onClick={() => setMode(m.value)}
                  className={`flex-1 px-3 py-2 rounded-lg border text-xs font-mono transition-all
                    ${mode === m.value
                      ? 'border-accent bg-accent/10 text-text'
                      : 'border-border hover:border-accent/40 text-text-dim'}`}
                >
                  {m.label}<br />
                  <span className="opacity-60">{m.questions}Q</span>
                </button>
              ))}
            </div>
          </div>

          {/* Company tone */}
          <div className="space-y-2">
            <label className="text-xs font-mono text-text-dim">Company Tone</label>
            <div className="grid grid-cols-2 gap-1.5">
              {TONES.map(t => (
                <button
                  key={t}
                  onClick={() => setTone(t)}
                  className={`px-3 py-2 rounded-lg border text-xs font-mono transition-all
                    ${tone === t
                      ? 'border-accent bg-accent/10 text-text'
                      : 'border-border hover:border-accent/40 text-text-dim'}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Timer */}
          <div className="space-y-2">
            <label className="text-xs font-mono text-text-dim">Time per Question</label>
            <div className="flex gap-2">
              {TIMERS.map(t => (
                <button
                  key={t.value}
                  onClick={() => setTimerSeconds(t.value)}
                  className={`flex-1 px-3 py-2 rounded-lg border text-xs font-mono transition-all
                    ${timerSeconds === t.value
                      ? 'border-accent bg-accent/10 text-text'
                      : 'border-border hover:border-accent/40 text-text-dim'}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* CTA */}
          <button
            onClick={handleStart}
            disabled={!ready}
            className="btn-primary w-full py-3 text-base mt-2"
          >
            {ready ? `Start Interview →` : 'Upload resume to begin'}
          </button>

          {ready && (
            <p className="text-xs text-text-dim font-mono text-center">
              {role} · {difficulty} · {mode} · {tone}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
import { useState, useRef } from 'react'
import { parseResume, updateResume } from '../api'
import { useResume } from '../hooks/useResume'
import ResumePreview from '../components/ResumePreview'
import CategorySelect from '../components/CategorySelect'


const ROLE_CATEGORIES = {
  "Software Development": [
    "Software Engineer",
    "Frontend Developer",
    "Backend Developer",
    "Full Stack Developer",
    "Web Developer",
    "Mobile App Developer",
    "Android Developer",
    "iOS Developer",
    "Game Developer"
  ],

  "AI & Data Science": [
    "Data Analyst",
    "Business Analyst",
    "Data Scientist",
    "Machine Learning Engineer",
    "AI Engineer",
    "Generative AI Engineer",
    "Deep Learning Engineer",
    "Computer Vision Engineer",
    "NLP Engineer",
    "MLOps Engineer",
    "Data Engineer",
    "BI Developer",
    "Prompt Engineer"
  ],

  "Cloud & DevOps": [
    "Cloud Engineer",
    "DevOps Engineer",
    "Site Reliability Engineer",
    "Platform Engineer",
    "Infrastructure Engineer",
    "Solutions Architect"
  ],

  "Cybersecurity": [
    "Cybersecurity Analyst",
    "Security Engineer",
    "SOC Analyst",
    "Penetration Tester",
    "Ethical Hacker",
    "Information Security Analyst"
  ],

  "Systems & Infrastructure": [
    "System Engineer",
    "Network Engineer",
    "Database Administrator",
    "Embedded Systems Engineer",
    "IoT Engineer"
  ],

  "Testing & QA": [
    "QA Engineer",
    "Automation Test Engineer",
    "Manual Test Engineer",
    "Performance Test Engineer"
  ],

  "Product & Management": [
    "Associate Product Manager",
    "Product Manager",
    "Technical Product Manager",
    "Project Manager",
    "Program Manager",
    "Scrum Master"
  ],

  "Design": [
    "UI Designer",
    "UX Designer",
    "UI/UX Designer",
    "Product Designer",
    "Graphic Designer"
  ],

  "Business & Finance": [
    "Business Development Executive",
    "Business Analyst",
    "Operations Analyst",
    "Marketing Executive",
    "Digital Marketing Specialist",
    "Financial Analyst",
    "Investment Analyst",
    "Risk Analyst",
    "Accountant"
  ],

  "Core Engineering": [
    "Mechanical Engineer",
    "Electrical Engineer",
    "Electronics Engineer",
    "Civil Engineer",
    "Chemical Engineer",
    "Production Engineer",
    "Industrial Engineer",
    "Automobile Engineer",
    "Aerospace Engineer"
  ],

  "HR & Consulting": [
    "HR Executive",
    "Talent Acquisition",
    "Recruiter",
    "Technology Consultant",
    "Management Consultant",
    "HR / Behavioral Only"
  ],

  "Students & Freshers": [
    "Campus Placement",
    "Graduate Engineer Trainee (GET)",
    "Software Engineering Intern",
    "Data Science Intern",
    "Machine Learning Intern",
    "Business Analyst Intern",
    "Summer Internship",
    "General Internship"
  ]
}

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

  const [roleCategory, setRoleCategory] = useState('Software Development')
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
      <div className="mb-10 pt-28">
        <div className="flex items-center gap-3 mb-2">
          <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          <span className="text-xs font-mono text-text-dim uppercase tracking-widest">Your resume. Your questions. No generic prep.</span>
        </div>
        <h1 className="text-8xl font-bold text-text">
          AI Mock <span className="font-extrabold inline-block bg-gradient-to-r from-violet-400 via-purple-500 to-fuchsia-500 bg-clip-text text-transparent">Interviewer</span>
        </h1>
        <p className="text-text-dim mt-2 text-sm ">
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

          {/* Role Category */}
          <div className="space-y-2">
            <label className="text-xs font-mono text-text-dim">Role Category</label>

            <CategorySelect
              value={roleCategory}
              onChange={(category) => {
                setRoleCategory(category);
                setRole(ROLE_CATEGORIES[category][0]);
              }}
              options={Object.keys(ROLE_CATEGORIES)}
            />
          </div>

          {/* Role */}
          <div className="space-y-2">
            <label className="text-xs font-mono text-text-dim">Target Role</label>
            <CategorySelect
              value={role}
              onChange={(selectedRole) => {
                setRole(selectedRole);
              }}
              options={ROLE_CATEGORIES[roleCategory]}
            />
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
            className='btn-primary bg-gradient-to-r from-accent via-accent-light to-fuchsia-500 hover:brightness-110 transition-all duration-300  w-full py-3 text-base mt-2'
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

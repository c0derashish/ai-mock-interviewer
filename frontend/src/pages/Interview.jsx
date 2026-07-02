import { useEffect, useState, useRef } from 'react'
import { generateQuestion, scoreAnswer, generateSummary } from '../api'
import QuestionCard from '../components/QuestionCard'
import FeedbackWidget from '../components/FeedbackWidget'
import Timer from '../components/Timer'
import { useTimer } from '../hooks/useTimer'

export default function Interview({ state, actions, onSummary }) {
  const {
    resumeHash, config, questions, currentIndex,
    followUpDepth, forcedEasyNext, loading, error
  } = state

  const {
    setLoading, setError, receiveQuestion, receiveScore,
    skipQuestion, setFollowUpDepth, nextQuestion, receiveSummary
  } = actions

  const currentQ = questions[currentIndex] || null
  const answered = !!currentQ?.score_result
  const totalMain = config.total_questions
  const mainQCount = questions.filter(q => !q.is_followup).length
  const isLastQuestion = mainQCount >= totalMain

  const [answer, setAnswer] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [generatingSummary, setGeneratingSummary] = useState(false)
  const [shakeSkip, setShakeSkip] = useState(false)
  const [processing, setProcessing] = useState(false)
  const textareaRef = useRef(null)
  const initialQuestionLoadedRef = useRef(false)

  const timerSeconds = config.timer_seconds || 0
  const noLimit = timerSeconds === 0

  const { seconds, ratio, isWarning, reset: resetTimer, restart: restartTimer } = useTimer(
    timerSeconds || 90,
    () => { if (!noLimit && !answered) handleTimerExpire() }
  )

  // Load first question on mount
  useEffect(() => {
    if (initialQuestionLoadedRef.current) return
    initialQuestionLoadedRef.current = true
    loadNextQuestion(false)
    // eslint-disable-next-line
  }, [])

  // Start timer when new question arrives
  useEffect(() => {
    if (currentQ && !answered && !noLimit) {
      restartTimer(timerSeconds)
    }
    if (currentQ && !answered) {
      setAnswer('')
      textareaRef.current?.focus()
    }
    // eslint-disable-next-line
  }, [currentIndex, currentQ?.q_data?.question])

  async function loadNextQuestion(isFollowup) {
    setLoading(true)
    setAnswer('')

    const history = questions
      .filter(q => !q.is_followup)
      .slice(-4)
      .map(q => ({
        question: q.q_data?.question,
        topic: q.q_data?.topic,
        type: q.q_data?.type,
      }))

    // If drift detected, inject easier config signal
    const cfg = forcedEasyNext
      ? { ...config, difficulty: 'Fresher', _drift_bridging: true }
      : config

    try {
      const q = await generateQuestion(resumeHash, cfg, history)
      q.is_followup = isFollowup
      receiveQuestion(q, isFollowup)
      textareaRef.current?.focus()
    } catch (e) {
      setError(e.message)
    }
  }

  async function handleSubmit() {
    if (!answer.trim() || submitting) return
    setSubmitting(true)
    setProcessing(true)

    try {
      const result = await scoreAnswer(
        currentQ.q_data,
        answer.trim(),
        resumeHash,
        currentQ.is_followup
      )
      receiveScore(answer.trim(), result)
      if (!noLimit) resetTimer(timerSeconds)
    } catch (e) {
      setError(e.message)
    } finally {
      setSubmitting(false)
      setProcessing(false)
    }
  }

  function handleTimerExpire() {
    if (!answered) {
      // Auto-skip with silence penalty
      skipQuestion()
      resetTimer(timerSeconds)
    }
  }

  function handleSkip() {
    setShakeSkip(true)
    setTimeout(() => setShakeSkip(false), 400)
    skipQuestion()
    resetTimer(timerSeconds)
  }

  async function handleNext() {
    nextQuestion()
    if (isLastQuestion && !currentQ?.score_result?.follow_up_question) {
      await handleFinish()
      return
    }
    await loadNextQuestion(false)
  }

  async function handleFollowUp() {
    const followUpQ = {
      question: currentQ.score_result.follow_up_question,
      type: currentQ.q_data.type,
      topic: currentQ.q_data.topic,
      expected_keywords: currentQ.q_data.expected_keywords,
      hint_for_scorer: currentQ.score_result.follow_up_depth,
      is_followup: true,
    }
    setFollowUpDepth(1)
    nextQuestion()
    setLoading(true)
    setAnswer('')
    receiveQuestion(followUpQ, true)
    textareaRef.current?.focus()
  }

  async function handleFinish() {
    setGeneratingSummary(true)
    try {
      const summary = await generateSummary(questions, resumeHash)
      receiveSummary(summary)
      onSummary()
    } catch (e) {
      setError(e.message)
    } finally {
      setGeneratingSummary(false)
    }
  }

  // Progress dots
  const dots = Array.from({ length: totalMain }, (_, i) => {
    const q = questions.filter(q => !q.is_followup)[i]
    return q?.score_result ? (q.skipped ? 'skip' : 'done') : (i === mainQCount - 1 ? 'current' : 'pending')
  })

  const wordCount = answer.trim().split(/\s+/).filter(Boolean).length

  if (generatingSummary) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-text-dim font-mono text-sm">Generating your performance summary...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 max-w-4xl mx-auto">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-6 py-3 border-b border-border">
        <div>
          <p className="text-xs font-mono text-text-dim">
            {config.company_tone} · {config.role} · {config.difficulty}
          </p>
        </div>

        <div className="flex items-center gap-4">
          {!noLimit && !answered && currentQ && (
            <Timer seconds={seconds} ratio={ratio} isWarning={isWarning} noLimit={noLimit} />
          )}

          {/* Progress dots */}
          <div className="flex items-center gap-1">
            {dots.map((status, i) => (
              <div
                key={i}
                className={`rounded-full transition-all duration-200 ${
                  status === 'done' ? 'w-2.5 h-2.5 bg-success' :
                  status === 'skip' ? 'w-2.5 h-2.5 bg-danger' :
                  status === 'current' ? 'w-2.5 h-2.5 bg-accent ring-2 ring-accent/30' :
                  'w-2 h-2 bg-border'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-danger/10 border border-danger/30 rounded-lg p-3">
          <p className="text-danger text-sm font-mono">{error}</p>
          <button onClick={() => loadNextQuestion(false)} className="text-xs text-danger underline mt-1">
            Retry
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Question + Answer */}
        <div className="lg:col-span-3 space-y-4">
          <QuestionCard
            question={currentQ?.q_data}
            qNumber={currentQ?.is_followup ? mainQCount : Math.max(1, mainQCount)}
            total={totalMain}
            isFollowup={currentQ?.is_followup}
            loading={loading && !currentQ}
          />

          {currentQ && !answered && (
            <div className="space-y-3">
              <textarea
                ref={textareaRef}
                value={answer}
                onChange={e => setAnswer(e.target.value)}
                placeholder="Type your answer here..."
                rows={7}
                className={`input-base font-mono text-sm resize-none leading-relaxed transition-all duration-300
                  ${processing ? 'animate-pulse-border' : ''}`}
                onKeyDown={e => {
                  if (e.key === 'Enter' && e.ctrlKey) handleSubmit()
                }}
              />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-text-dim">{wordCount} words</span>
                  <span className="text-xs font-mono text-text-dim">Ctrl+Enter to submit</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSkip}
                    className={`btn-ghost text-sm ${shakeSkip ? 'animate-shake' : ''}`}
                  >
                    I don't know
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={!answer.trim() || submitting}
                    className="btn-primary text-sm"
                  >
                    {submitting ? 'Scoring...' : 'Submit →'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Show submitted answer */}
          {currentQ?.user_answer && (
            <div className="card bg-bg">
              <p className="text-xs font-mono text-text-dim mb-2">Your answer</p>
              <p className="text-sm text-text-dim font-mono leading-relaxed whitespace-pre-wrap">
                {currentQ.user_answer}
              </p>
            </div>
          )}
        </div>

        {/* Right: Feedback */}
        <div className="lg:col-span-2">
          {answered && (
            <FeedbackWidget
              scoreResult={currentQ.score_result}
              questionData={currentQ.q_data}
              userAnswer={currentQ.user_answer}
              onFollowUp={handleFollowUp}
              onNext={isLastQuestion ? handleFinish : handleNext}
              isLastQuestion={isLastQuestion}
              followUpDepth={followUpDepth}
            />
          )}

          {!answered && !loading && (
            <div className="card text-center py-10">
              <p className="text-text-dim font-mono text-xs">
                Answer the question to see feedback
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

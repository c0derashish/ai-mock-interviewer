import { useState } from 'react'
import ScoreBar from './ScoreBar'
import { reevalAnswer } from '../api'

export default function FeedbackWidget({
  scoreResult, questionData, userAnswer,
  onFollowUp, onNext, isLastQuestion, followUpDepth
}) {
  const [reeval, setReeval] = useState(null)
  const [reevalLoading, setReevalLoading] = useState(false)

  if (!scoreResult) return null

  const {
    final_score, keyword_coverage,
    strengths, gaps, ideal_hint,
    follow_up_question
  } = scoreResult

  const canFollowUp = follow_up_question && followUpDepth < 1 && final_score < 8

  async function handleChallenge() {
    setReevalLoading(true)
    try {
      const result = await reevalAnswer(questionData, userAnswer, final_score)
      setReeval(result)
    } catch (e) {
      console.error(e)
    } finally {
      setReevalLoading(false)
    }
  }

  return (
    <div className="card space-y-5 animate-slide-up border-l-2 border-l-accent">
      {/* Score */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono text-text-dim uppercase tracking-wider">Score</span>
          <span className={`text-2xl font-mono font-bold tabular-nums ${
            final_score >= 8 ? 'text-success' :
            final_score >= 6.5 ? 'text-warning' :
            final_score >= 5 ? 'text-orange-400' : 'text-danger'
          }`}>
            {final_score.toFixed(1)}<span className="text-sm text-text-dim">/10</span>
          </span>
        </div>
        <ScoreBar score={final_score} showNumber={false} />
        {keyword_coverage?.display && (
          <p className="text-xs font-mono text-text-dim">
            {keyword_coverage.display} expected terms found
          </p>
        )}
      </div>

      {/* Strengths */}
      {strengths?.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-mono text-success uppercase tracking-wider">✓ Strengths</p>
          <ul className="space-y-1">
            {strengths.map((s, i) => (
              <li key={i} className="text-sm text-text flex gap-2">
                <span className="text-success mt-0.5 shrink-0">•</span>
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Gaps */}
      {gaps?.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-mono text-danger uppercase tracking-wider">✗ Gaps</p>
          <ul className="space-y-1">
            {gaps.map((g, i) => (
              <li key={i} className="text-sm text-text flex gap-2">
                <span className="text-danger mt-0.5 shrink-0">•</span>
                {g}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Ideal hint */}
      {ideal_hint && (
        <div className="bg-bg border border-border rounded-lg p-3">
          <p className="text-xs font-mono text-text-dim mb-1">→ to score 9–10</p>
          <p className="text-sm text-text-dim">{ideal_hint}</p>
        </div>
      )}

      {/* Follow-up */}
      {canFollowUp && (
        <div className="bg-warning/5 border border-warning/20 rounded-lg p-3">
          <p className="text-xs font-mono text-warning mb-1.5">↩ Follow-up</p>
          <p className="text-sm text-text font-mono">{follow_up_question}</p>
        </div>
      )}

      {/* Challenge Me re-eval */}
      {!reeval && final_score < 9 && (
        <button
          onClick={handleChallenge}
          disabled={reevalLoading}
          className="text-xs text-text-dim hover:text-accent font-mono underline underline-offset-2"
        >
          {reevalLoading ? 'Re-evaluating...' : 'I deserved more →'}
        </button>
      )}

      {reeval && (
        <div className={`border rounded-lg p-3 ${
          reeval.delta > 0 ? 'border-success/30 bg-success/5' : 'border-border bg-bg'
        }`}>
          <p className="text-xs font-mono text-text-dim mb-1">Re-evaluation result</p>
          <p className={`text-sm font-mono font-semibold ${
            reeval.delta > 0 ? 'text-success' : 'text-text-dim'
          }`}>
            {reeval.verdict}
            {reeval.delta > 0 && ` · +${reeval.delta} points`}
          </p>
          {reeval.why_higher && (
            <p className="text-xs text-text-dim mt-1">{reeval.why_higher}</p>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-3 pt-1">
        {canFollowUp && (
          <button onClick={onFollowUp} className="btn-primary text-sm">
            Answer follow-up
          </button>
        )}
        <button
          onClick={onNext}
          className={canFollowUp ? 'btn-ghost text-sm' : 'btn-primary text-sm'}
        >
          {isLastQuestion && !canFollowUp ? 'View summary →' : 'Next question →'}
        </button>
      </div>
    </div>
  )
}
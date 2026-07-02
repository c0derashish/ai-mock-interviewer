import HeatmapTable from '../components/HeatmapTable'
import GapPlanCard from '../components/GapPlanCard'
import ScoreBar from '../components/ScoreBar'
import { downloadSession } from '../utils/export'

const LABEL_COLORS = {
  'Strong Candidate': 'text-success',
  'Interview Ready': 'text-warning',
  'Needs Preparation': 'text-orange-400',
  'Not Ready': 'text-danger',
}

export default function Summary({ state, onRetry, onReset }) {
  const { summary, config, resumeData, questions } = state

  if (!summary) return null

  const {
    overall_score, performance_label, heatmap,
    gap_plans, next_session_focus, overall_advice,
    total_questions, skipped
  } = summary

  const answered = total_questions - skipped
  const labelColor = LABEL_COLORS[performance_label] || 'text-text'

  const gapTopics = heatmap?.filter(h => h.status === 'gap' || h.status === 'needs_work') || []

  return (
    <div className="min-h-screen p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <span className="w-2 h-2 rounded-full bg-success" />
          <span className="text-xs font-mono text-text-dim uppercase tracking-widest">Interview Complete</span>
        </div>

        <div className="card mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-5xl font-mono font-bold tabular-nums text-text">
                  {Math.round(overall_score)}
                </span>
                <span className="text-text-dim font-mono">/100</span>
              </div>
              <p className={`text-sm font-semibold ${labelColor}`}>{performance_label}</p>
            </div>
            <div className="text-right text-xs font-mono text-text-dim space-y-1">
              <p>{config.role}</p>
              <p>{config.company_tone} · {config.difficulty}</p>
              <p>{answered}/{total_questions} answered</p>
              <p>{new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
            </div>
          </div>

          <ScoreBar score={overall_score / 10} max={10} showNumber={false} />

          {overall_advice && (
            <p className="text-sm text-text-dim mt-4 leading-relaxed border-t border-border pt-4">
              {overall_advice}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Heatmap */}
        <HeatmapTable heatmap={heatmap} />

        {/* Quick Stats */}
        <div className="card space-y-4">
          <h3 className="text-sm font-mono text-text-dim uppercase tracking-wider">Session Stats</h3>
          <div className="space-y-3">
            {[
              { label: 'Questions answered', value: answered },
              { label: 'Questions skipped', value: skipped },
              { label: 'Strong topics', value: heatmap?.filter(h => h.status === 'strong').length || 0 },
              { label: 'Topics needing work', value: gapTopics.length },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between items-center py-2 border-b border-border last:border-0">
                <span className="text-sm text-text-dim">{label}</span>
                <span className="text-sm font-mono font-medium text-text tabular-nums">{value}</span>
              </div>
            ))}
          </div>

          {next_session_focus && (
            <div className="bg-accent/10 border border-accent/30 rounded-lg p-3 mt-2">
              <p className="text-xs font-mono text-accent mb-1">Next session focus</p>
              <p className="text-sm text-text">{next_session_focus}</p>
            </div>
          )}
        </div>
      </div>

      {/* Gap plans */}
      {gap_plans?.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-mono text-text-dim uppercase tracking-wider mb-4">
            Improvement Plan
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {gap_plans.map((plan, i) => (
              <GapPlanCard key={i} plan={plan} />
            ))}
          </div>
        </div>
      )}

      {/* Q&A log */}
      <div className="mb-8">
        <h2 className="text-sm font-mono text-text-dim uppercase tracking-wider mb-4">Answer Log</h2>
        <div className="space-y-3">
          {questions.map((q, i) => {
            const score = q.score_result?.final_score
            return (
              <details key={i} className="card group cursor-pointer">
                <summary className="flex items-center justify-between list-none">
                  <div className="flex items-center gap-3">
                    {q.is_followup && (
                      <span className="text-xs font-mono text-warning">↩</span>
                    )}
                    <span className="text-sm text-text font-mono line-clamp-1 pr-4">
                      {q.q_data?.question}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {q.skipped ? (
                      <span className="text-xs font-mono text-danger">skipped</span>
                    ) : (
                      <span className={`text-sm font-mono font-semibold tabular-nums ${
                        score >= 8 ? 'text-success' :
                        score >= 6.5 ? 'text-warning' :
                        score >= 5 ? 'text-orange-400' : 'text-danger'
                      }`}>{score?.toFixed(1)}</span>
                    )}
                    <span className="text-text-dim text-xs group-open:rotate-180 transition-transform">▾</span>
                  </div>
                </summary>
                <div className="pt-4 mt-4 border-t border-border space-y-3">
                  {q.user_answer && (
                    <div>
                      <p className="text-xs font-mono text-text-dim mb-1">Your answer</p>
                      <p className="text-sm text-text-dim font-mono leading-relaxed">{q.user_answer}</p>
                    </div>
                  )}
                  {q.score_result?.strengths?.length > 0 && (
                    <div>
                      <p className="text-xs font-mono text-success mb-1">Strengths</p>
                      {q.score_result.strengths.map((s, j) => (
                        <p key={j} className="text-xs text-text-dim">• {s}</p>
                      ))}
                    </div>
                  )}
                  {q.score_result?.gaps?.length > 0 && (
                    <div>
                      <p className="text-xs font-mono text-danger mb-1">Gaps</p>
                      {q.score_result.gaps.map((g, j) => (
                        <p key={j} className="text-xs text-text-dim">• {g}</p>
                      ))}
                    </div>
                  )}
                  {q.score_result?.ideal_hint && (
                    <p className="text-xs text-text-dim italic">{q.score_result.ideal_hint}</p>
                  )}
                </div>
              </details>
            )
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <button onClick={onRetry} className="btn-primary">
          Retry weak topics →
        </button>
        <button
          onClick={() => downloadSession(state, summary)}
          className="btn-ghost"
        >
          Export JSON
        </button>
        <button onClick={onReset} className="btn-ghost">
          New interview
        </button>
      </div>
    </div>
  )
}
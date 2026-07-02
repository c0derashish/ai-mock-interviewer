const TYPE_COLORS = {
  'technical': 'bg-accent/10 text-accent-light border-accent/30',
  'behavioral': 'bg-success/10 text-success border-success/30',
  'situational': 'bg-warning/10 text-warning border-warning/30',
  'resume-based': 'bg-purple-400/10 text-purple-400 border-purple-400/30',
}

export default function QuestionCard({ question, qNumber, total, isFollowup, loading }) {
  if (loading) {
    return (
      <div className="card space-y-4 animate-pulse">
        <div className="h-3 bg-border rounded w-24" />
        <div className="space-y-2">
          <div className="h-4 bg-border rounded w-full" />
          <div className="h-4 bg-border rounded w-4/5" />
          <div className="h-4 bg-border rounded w-3/5" />
        </div>
      </div>
    )
  }

  if (!question) return null

  const typeStyle = TYPE_COLORS[question.type] || 'bg-border text-text-dim border-border'

  return (
    <div className="card space-y-4 animate-slide-up">
      {/* Meta */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isFollowup ? (
            <span className="tag bg-warning/10 text-warning border-warning/30">↩ follow-up</span>
          ) : (
            <span className="text-xs font-mono text-text-dim">
              Q{qNumber} / {total}
            </span>
          )}
          <span className={`tag ${typeStyle}`}>{question.type}</span>
          {question.topic && (
            <span className="tag-topic">{question.topic}</span>
          )}
        </div>
      </div>

      {/* Question text */}
      <p className="font-mono text-text text-sm leading-relaxed">
        {question.question}
      </p>
    </div>
  )
}
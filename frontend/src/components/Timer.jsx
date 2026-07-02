export default function Timer({ seconds, ratio, isWarning, noLimit }) {
  if (noLimit) {
    return (
      <div className="flex items-center gap-2 text-text-dim text-sm font-mono">
        <span className="w-2 h-2 rounded-full bg-success animate-pulse inline-block" />
        No time limit
      </div>
    )
  }

  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  const display = `${mins}:${secs.toString().padStart(2, '0')}`
  const barWidth = `${Math.max(0, ratio * 100)}%`

  return (
    <div className="space-y-1.5">
      <div className={`font-mono text-sm font-medium tabular-nums ${isWarning ? 'text-danger' : 'text-text-dim'}`}>
        {display}
      </div>
      <div className="h-1 w-28 bg-border rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${isWarning ? 'bg-danger' : 'bg-accent'}`}
          style={{ width: barWidth }}
        />
      </div>
    </div>
  )
}
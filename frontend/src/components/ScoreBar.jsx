import { useEffect, useState } from 'react'

export default function ScoreBar({ score, max = 10, label, showNumber = true }) {
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const t = setTimeout(() => {
      setWidth((score / max) * 100)
    }, 80)
    return () => clearTimeout(t)
  }, [score, max])

  const color =
    score >= 8 ? 'bg-success' :
    score >= 6.5 ? 'bg-warning' :
    score >= 5 ? 'bg-orange-400' :
    'bg-danger'

  return (
    <div className="space-y-1.5">
      {(label || showNumber) && (
        <div className="flex items-center justify-between">
          {label && <span className="text-xs text-text-dim font-mono">{label}</span>}
          {showNumber && (
            <span className={`text-sm font-mono font-semibold tabular-nums ${
              score >= 8 ? 'text-success' :
              score >= 6.5 ? 'text-warning' :
              score >= 5 ? 'text-orange-400' : 'text-danger'
            }`}>
              {score.toFixed(1)}/{max}
            </span>
          )}
        </div>
      )}
      <div className="h-2 bg-border rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${color}`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  )
}
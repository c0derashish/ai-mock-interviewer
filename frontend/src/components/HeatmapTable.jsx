import { statusEmoji, statusColor, statusBg } from '../utils/heatmap'
import ScoreBar from './ScoreBar'

export default function HeatmapTable({ heatmap }) {
  if (!heatmap?.length) return null

  const sorted = [...heatmap].sort((a, b) => a.avg_score - b.avg_score)

  return (
    <div className="card space-y-4">
      <h3 className="text-sm font-mono text-text-dim uppercase tracking-wider">Skill Heatmap</h3>
      <div className="space-y-3">
        {sorted.map((item, i) => (
          <div key={i} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span>{statusEmoji(item.status)}</span>
                <span className="text-sm text-text font-medium">{item.topic}</span>
                <span className="text-xs text-text-dim font-mono">×{item.questions}</span>
              </div>
              <span className={`text-sm font-mono font-semibold tabular-nums ${statusColor(item.status)}`}>
                {item.avg_score.toFixed(1)}
              </span>
            </div>
            <ScoreBar score={item.avg_score} showNumber={false} />
          </div>
        ))}
      </div>
    </div>
  )
}
export function statusColor(status) {
  return {
    strong: 'text-success',
    good: 'text-warning',
    needs_work: 'text-orange-400',
    gap: 'text-danger',
  }[status] || 'text-text-dim'
}

export function statusBg(status) {
  return {
    strong: 'bg-success/10 border-success/20',
    good: 'bg-warning/10 border-warning/20',
    needs_work: 'bg-orange-400/10 border-orange-400/20',
    gap: 'bg-danger/10 border-danger/20',
  }[status] || 'bg-surface border-border'
}

export function statusEmoji(status) {
  return { strong: '🟢', good: '🟡', needs_work: '🟠', gap: '🔴' }[status] || '⚪'
}

export function scoreToStatus(avg) {
  if (avg >= 8) return 'strong'
  if (avg >= 6.5) return 'good'
  if (avg >= 5) return 'needs_work'
  return 'gap'
}
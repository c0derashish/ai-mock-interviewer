export function downloadSession(state, summary) {
  const data = {
    exported_at: new Date().toISOString(),
    config: state.config,
    resume_name: state.resumeData?.personal?.name || 'Unknown',
    summary,
    questions: state.questions.map(q => ({
      question: q.q_data?.question,
      topic: q.q_data?.topic,
      type: q.q_data?.type,
      is_followup: q.is_followup,
      skipped: q.skipped,
      user_answer: q.user_answer,
      final_score: q.score_result?.final_score,
      keyword_coverage: q.score_result?.keyword_coverage?.display,
      strengths: q.score_result?.strengths,
      gaps: q.score_result?.gaps,
    }))
  }

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const role = state.config.role.replace(/\s+/g, '_')
  const date = new Date().toISOString().split('T')[0]
  a.href = url
  a.download = `mock_interview_${role}_${date}.json`
  a.click()
  URL.revokeObjectURL(url)
}
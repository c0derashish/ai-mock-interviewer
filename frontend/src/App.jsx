import { useSession } from './hooks/useSession'
import Setup from './pages/Setup'
import Interview from './pages/Interview'
import Summary from './pages/Summary'

export default function App() {
  const sessionHook = useSession()
  const {
    state,
    setResume, setConfig, startInterview,
    setLoading, setError, receiveQuestion, receiveScore,
    skipQuestion, setFollowUpDepth, nextQuestion, receiveSummary,
    reset
  } = sessionHook

  const actions = {
    setLoading, setError, receiveQuestion, receiveScore,
    skipQuestion, setFollowUpDepth, nextQuestion, receiveSummary
  }

  function handleStart({ resumeHash, resumeData, config }) {
    setResume(resumeHash, resumeData)
    setConfig(config)
    startInterview()
  }

  function handleSummary() {
    // phase change handled in state via receiveSummary
  }

  function handleRetry() {
    // Re-start with same resume, same config, filter to gap topics
    const gapTopics = state.summary?.heatmap
      ?.filter(h => h.status === 'gap' || h.status === 'needs_work')
      ?.map(h => h.topic) || []

    // Keep resume + config, restart
    const config = { ...state.config }
    const resumeHash = state.resumeHash
    const resumeData = state.resumeData
    reset()
    // Small delay to allow state to clear
    setTimeout(() => {
      setResume(resumeHash, resumeData)
      setConfig({ ...config, _retry_gaps: gapTopics })
      startInterview()
    }, 50)
  }

  if (state.phase === 'setup') {
    return <Setup session={state} onStart={handleStart} />
  }

  if (state.phase === 'interview') {
    return (
      <Interview
        state={state}
        actions={actions}
        onSummary={handleSummary}
      />
    )
  }

  if (state.phase === 'summary') {
    return (
      <Summary
        state={state}
        onRetry={handleRetry}
        onReset={reset}
      />
    )
  }

  return null
}
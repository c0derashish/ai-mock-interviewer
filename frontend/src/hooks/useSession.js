import { useReducer, useCallback } from 'react'

const initialState = {
  phase: 'setup',               // setup | interview | summary
  resumeHash: null,
  resumeData: null,
  config: {
    role: 'Software Engineer',
    difficulty: 'Fresher',
    mode: 'Standard',
    company_tone: 'Product MNC',
    total_questions: 10,
  },
  questions: [],                // { q_data, user_answer, score_result, is_followup, skipped }
  currentIndex: 0,
  followUpDepth: 0,             // 0=main Q, 1=follow-up (max)
  consecutiveLowScores: 0,
  forcedEasyNext: false,
  summary: null,
  loading: false,
  error: null,
}

function reducer(state, action) {
  switch (action.type) {
    case 'RESUME_LOADED':
      return {
        ...state,
        resumeHash: action.hash,
        resumeData: action.data,
      }
    case 'SET_CONFIG':
      return {
        ...state,
        config: { ...state.config, ...action.config }
      }
    case 'START_INTERVIEW':
      return {
        ...state,
        phase: 'interview',
        questions: [],
        currentIndex: 0,
        followUpDepth: 0,
        consecutiveLowScores: 0,
        forcedEasyNext: false,
        summary: null,
        error: null,
      }
    case 'SET_LOADING':
      return { ...state, loading: action.value }
    case 'SET_ERROR':
      return { ...state, error: action.error, loading: false }

    case 'QUESTION_RECEIVED': {
      const newQ = {
        q_data: action.question,
        user_answer: null,
        score_result: null,
        is_followup: action.isFollowup || false,
        skipped: false,
      }
      return {
        ...state,
        questions: [...state.questions, newQ],
        currentIndex: state.questions.length,
        loading: false,
      }
    }

    case 'ANSWER_SUBMITTED':
      return { ...state, loading: true }

    case 'SCORE_RECEIVED': {
      const updated = [...state.questions]
      updated[state.currentIndex] = {
        ...updated[state.currentIndex],
        user_answer: action.answer,
        score_result: action.scoreResult,
      }

      const score = action.scoreResult.final_score
      const isLow = score < 5
      const newConsecutive = isLow ? state.consecutiveLowScores + 1 : 0
      const forcedEasy = newConsecutive >= 3

      return {
        ...state,
        questions: updated,
        consecutiveLowScores: forcedEasy ? 0 : newConsecutive,
        forcedEasyNext: forcedEasy,
        loading: false,
      }
    }

    case 'SKIP_QUESTION': {
      const updated = [...state.questions]
      updated[state.currentIndex] = {
        ...updated[state.currentIndex],
        skipped: true,
        score_result: {
          final_score: 0,
          llm_score: 0,
          keyword_coverage: { matched: [], unmatched: [], ratio: 0, display: 'Skipped' },
          strengths: [],
          gaps: ['No answer provided'],
          ideal_hint: '',
          follow_up_question: null,
        }
      }
      return {
        ...state,
        questions: updated,
        consecutiveLowScores: state.consecutiveLowScores + 1,
        followUpDepth: 0,
        loading: false,
      }
    }

    case 'SET_FOLLOWUP_DEPTH':
      return { ...state, followUpDepth: action.depth }

    case 'NEXT_QUESTION':
      return {
        ...state,
        followUpDepth: 0,
        forcedEasyNext: false,
      }

    case 'SUMMARY_RECEIVED':
      return {
        ...state,
        phase: 'summary',
        summary: action.summary,
        loading: false,
      }

    case 'RESET':
      return { ...initialState }

    default:
      return state
  }
}

export function useSession() {
  const [state, dispatch] = useReducer(reducer, initialState)

  const setResume = useCallback((hash, data) => {
    dispatch({ type: 'RESUME_LOADED', hash, data })
  }, [])

  const setConfig = useCallback((config) => {
    dispatch({ type: 'SET_CONFIG', config })
  }, [])

  const startInterview = useCallback(() => {
    dispatch({ type: 'START_INTERVIEW' })
  }, [])

  const setLoading = useCallback((value) => {
    dispatch({ type: 'SET_LOADING', value })
  }, [])

  const setError = useCallback((error) => {
    dispatch({ type: 'SET_ERROR', error })
  }, [])

  const receiveQuestion = useCallback((question, isFollowup = false) => {
    dispatch({ type: 'QUESTION_RECEIVED', question, isFollowup })
  }, [])

  const receiveScore = useCallback((answer, scoreResult) => {
    dispatch({ type: 'SCORE_RECEIVED', answer, scoreResult })
  }, [])

  const skipQuestion = useCallback(() => {
    dispatch({ type: 'SKIP_QUESTION' })
  }, [])

  const setFollowUpDepth = useCallback((depth) => {
    dispatch({ type: 'SET_FOLLOWUP_DEPTH', depth })
  }, [])

  const nextQuestion = useCallback(() => {
    dispatch({ type: 'NEXT_QUESTION' })
  }, [])

  const receiveSummary = useCallback((summary) => {
    dispatch({ type: 'SUMMARY_RECEIVED', summary })
  }, [])

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' })
  }, [])

  // Derived helpers
  const currentQ = state.questions[state.currentIndex] || null
  const totalMain = state.config.total_questions
  const mainQCount = state.questions.filter(q => !q.is_followup).length
  const isLastQuestion = mainQCount >= totalMain

  // Build history for question generation (exclude follow-ups, cap last 4)
  const historyForPrompt = state.questions
    .filter(q => q.q_data && !q.is_followup)
    .slice(-4)
    .map(q => ({
      question: q.q_data.question,
      topic: q.q_data.topic,
      type: q.q_data.type,
    }))

  return {
    state,
    currentQ,
    totalMain,
    mainQCount,
    isLastQuestion,
    historyForPrompt,
    setResume,
    setConfig,
    startInterview,
    setLoading,
    setError,
    receiveQuestion,
    receiveScore,
    skipQuestion,
    setFollowUpDepth,
    nextQuestion,
    receiveSummary,
    reset,
  }
}
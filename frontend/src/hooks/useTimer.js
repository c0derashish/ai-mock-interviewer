import { useState, useEffect, useRef, useCallback } from 'react'

export function useTimer(initialSeconds, onExpire) {
  const [seconds, setSeconds] = useState(initialSeconds)
  const [running, setRunning] = useState(false)
  const intervalRef = useRef(null)
  const onExpireRef = useRef(onExpire)

  useEffect(() => { onExpireRef.current = onExpire }, [onExpire])

  const clearTimer = useCallback(() => {
    clearInterval(intervalRef.current)
    intervalRef.current = null
  }, [])

  const start = useCallback(() => {
    clearTimer()
    setRunning(true)
    intervalRef.current = setInterval(() => {
      setSeconds(prev => {
        if (prev <= 1) {
          clearTimer()
          setRunning(false)
          onExpireRef.current?.()
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }, [clearTimer])

  const pause = useCallback(() => {
    clearTimer()
    setRunning(false)
  }, [clearTimer])

  const reset = useCallback((newSeconds) => {
    clearTimer()
    setRunning(false)
    setSeconds(newSeconds ?? initialSeconds)
  }, [clearTimer, initialSeconds])

  const restart = useCallback((newSeconds) => {
    const nextSeconds = newSeconds ?? initialSeconds
    clearTimer()
    setSeconds(nextSeconds)
    setRunning(true)
    intervalRef.current = setInterval(() => {
      setSeconds(prev => {
        if (prev <= 1) {
          clearTimer()
          setRunning(false)
          onExpireRef.current?.()
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }, [clearTimer, initialSeconds])

  useEffect(() => () => clearTimer(), [clearTimer])

  const ratio = seconds / initialSeconds
  const isWarning = ratio < 0.25

  return { seconds, running, ratio, isWarning, start, pause, reset, restart }
}

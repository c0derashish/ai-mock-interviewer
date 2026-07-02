import { useState, useEffect } from 'react'
import { getResume } from '../api'

const LS_KEY = 'mock_interview_resume_hash'
const LS_NAME_KEY = 'mock_interview_resume_name'
const LS_DATE_KEY = 'mock_interview_resume_date'

export function useResume() {
  const [cachedHash, setCachedHash] = useState(null)
  const [cachedName, setCachedName] = useState(null)
  const [cachedDate, setCachedDate] = useState(null)
  const [cachedData, setCachedData] = useState(null)
  const [loading, setLoading] = useState(true)

  // On mount: check localStorage
  useEffect(() => {
    const hash = localStorage.getItem(LS_KEY)
    const name = localStorage.getItem(LS_NAME_KEY)
    const date = localStorage.getItem(LS_DATE_KEY)
    if (hash) {
      setCachedHash(hash)
      setCachedName(name)
      setCachedDate(date)
      // Fetch cached resume data from server
      getResume(hash)
        .then(data => setCachedData(data))
        .catch(() => {
          // Cache miss on server — clear localStorage
          clearCache()
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  function saveToCache(hash, resumeData) {
    const name = resumeData?.personal?.name || 'Unknown'
    const date = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    localStorage.setItem(LS_KEY, hash)
    localStorage.setItem(LS_NAME_KEY, name)
    localStorage.setItem(LS_DATE_KEY, date)
    setCachedHash(hash)
    setCachedName(name)
    setCachedDate(date)
    setCachedData(resumeData)
  }

  function clearCache() {
    localStorage.removeItem(LS_KEY)
    localStorage.removeItem(LS_NAME_KEY)
    localStorage.removeItem(LS_DATE_KEY)
    setCachedHash(null)
    setCachedName(null)
    setCachedDate(null)
    setCachedData(null)
  }

  return { cachedHash, cachedName, cachedDate, cachedData, loading, saveToCache, clearCache }
}
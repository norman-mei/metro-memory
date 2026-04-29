'use client'

import { useEffect } from 'react'

const RETRY_WINDOW_MS = 10000
const MAX_RETRIES = 2
const RETRY_STATE_PREFIX = 'metro-memory:dev-not-found-retry:'
const TOAST_STORAGE_KEY = 'metro-memory:dev-site-refresh-toast'

function writeToastPayload() {
  if (typeof window === 'undefined') {
    return
  }

  window.sessionStorage.setItem(
    TOAST_STORAGE_KEY,
    JSON.stringify({ shownAt: Date.now() }),
  )
}

export default function DevNotFoundAutoRetry() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') {
      return
    }

    const retryKey = `${RETRY_STATE_PREFIX}${window.location.pathname}`
    const now = Date.now()

    let retries = 0
    let firstAttemptAt = now

    try {
      const raw = window.sessionStorage.getItem(retryKey)
      if (raw) {
        const parsed = JSON.parse(raw) as { retries?: number; firstAttemptAt?: number }
        retries = typeof parsed?.retries === 'number' ? parsed.retries : 0
        firstAttemptAt =
          typeof parsed?.firstAttemptAt === 'number' ? parsed.firstAttemptAt : now
      }
    } catch {
      retries = 0
      firstAttemptAt = now
    }

    if (now - firstAttemptAt > RETRY_WINDOW_MS) {
      retries = 0
      firstAttemptAt = now
    }

    if (retries >= MAX_RETRIES) {
      return
    }

    const timeout = window.setTimeout(() => {
      window.sessionStorage.setItem(
        retryKey,
        JSON.stringify({ retries: retries + 1, firstAttemptAt }),
      )
      writeToastPayload()
      window.location.reload()
    }, 10)

    return () => window.clearTimeout(timeout)
  }, [])

  return null
}

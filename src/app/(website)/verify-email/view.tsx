'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

import { useAuth } from '@/context/AuthContext'

type Status = 'idle' | 'loading' | 'success' | 'error'

export default function VerifyEmailClient() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState<string>('')
  const { refresh } = useAuth()

  useEffect(() => {
    const verify = async () => {
      if (!token) {
        setStatus('error')
        setMessage('Missing verification token.')
        return
      }
      setStatus('loading')
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      if (response.ok) {
        setStatus('success')
        setMessage('Email verified! You are now signed in.')
        await refresh()
      } else {
        const data = await response.json().catch(() => ({}))
        setStatus('error')
        setMessage(data?.error ?? 'Verification link has expired or is invalid.')
      }
    }

    void verify()
  }, [token, refresh])

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Verify email</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        {status === 'loading'
          ? 'Verifying your email…'
          : message || 'Processing your verification link.'}
      </p>
      {status === 'success' && (
        <p className="mt-4 text-sm text-emerald-600 dark:text-emerald-400">
          You can close this tab and start memorizing more metros!
        </p>
      )}
      {status === 'error' && (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400">
          {message || 'This verification link is no longer valid.'}
        </p>
      )}
    </div>
  )
}

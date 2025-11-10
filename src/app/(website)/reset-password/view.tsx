'use client'

import { FormEvent, useState } from 'react'
import { useSearchParams } from 'next/navigation'

type Status = 'idle' | 'success' | 'error'

export default function ResetPasswordClient() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState<string>('')

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!token) {
      setStatus('error')
      setMessage('Missing reset token.')
      return
    }
    const formData = new FormData(event.currentTarget)
    const password = String(formData.get('password') ?? '')
    const confirmPassword = String(formData.get('confirmPassword') ?? '')
    if (password !== confirmPassword) {
      setStatus('error')
      setMessage('Passwords do not match.')
      return
    }
    const response = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    })
    if (response.ok) {
      setStatus('success')
      setMessage('Password updated. You can now log in with the new password.')
      event.currentTarget.reset()
    } else {
      const data = await response.json().catch(() => ({}))
      setStatus('error')
      setMessage(data?.error ?? 'Unable to reset your password.')
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Reset your password</h1>
      {token ? (
        <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
          <input
            required
            type="password"
            name="password"
            minLength={8}
            placeholder="New password (min 8 characters)"
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          />
          <input
            required
            type="password"
            name="confirmPassword"
            minLength={8}
            placeholder="Confirm password"
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          />
          {status !== 'idle' && (
            <p
              className={`text-sm ${
                status === 'error'
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-emerald-600 dark:text-emerald-400'
              }`}
            >
              {message}
            </p>
          )}
      <button
        type="submit"
        className="w-full rounded-full bg-[var(--accent-600)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--accent-500)] dark:bg-[var(--accent-600)] dark:hover:bg-[var(--accent-500)]"
      >
        Update password
          </button>
        </form>
      ) : (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">
          This reset link is missing a token or has already been used.
        </p>
      )}
    </div>
  )
}

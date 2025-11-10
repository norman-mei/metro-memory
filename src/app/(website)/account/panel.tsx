'use client'

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'

import { useAuth } from '@/context/AuthContext'
import { cities } from '@/lib/citiesConfig'

type MessageState = {
  type: 'idle' | 'success' | 'error'
  message?: string
}

const citySlugMap = new Map(
  cities
    .map((city) => {
      if (!city.link.startsWith('/')) return null
      const slug = city.link.replace(/^\//, '').split(/[?#]/)[0]
      return [slug, city.name] as const
    })
    .filter((entry): entry is [string, string] => Boolean(entry)),
)

export default function AccountDashboard() {
  const { user, loading, refresh, progressSummaries, logoutLocally } = useAuth()
  const [registerState, setRegisterState] = useState<MessageState>({ type: 'idle' })
  const [loginState, setLoginState] = useState<MessageState>({ type: 'idle' })
  useEffect(() => {
    setRegisterState({ type: 'idle' })
  }, [])

  const handleRegister = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    const formData = new FormData(form)
    setRegisterState({ type: 'idle' })

    const payload = {
      email: String(formData.get('registerEmail') ?? ''),
      password: String(formData.get('registerPassword') ?? ''),
      confirmPassword: String(formData.get('registerConfirmPassword') ?? ''),
    }

    setRegisterState({ type: 'idle', message: undefined })

    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (response.ok) {
      setRegisterState({
        type: 'success',
        message: 'Account created! You can now log in.',
      })
      form.reset()
    } else {
      const data = await response.json().catch(() => ({}))
      setRegisterState({
        type: 'error',
        message: data?.error ?? 'Unable to create your account.',
      })
    }

  }

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    setLoginState({ type: 'idle' })

    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: formData.get('loginEmail'),
        password: formData.get('loginPassword'),
      }),
    })

    if (response.ok) {
      setLoginState({
        type: 'success',
        message: 'Welcome back! Redirecting your data…',
      })
      await refresh()
      event.currentTarget.reset()
    } else {
      const data = await response.json().catch(() => ({}))
      setLoginState({
        type: 'error',
        message: data?.error ?? 'Unable to log you in.',
      })
    }
  }

  const handleLogout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    logoutLocally()
    await refresh()
  }, [logoutLocally, refresh])

  const progressEntries = useMemo(() => {
    return Object.entries(progressSummaries)
      .sort((a, b) => b[1] - a[1])
      .map(([slug, count]) => ({
        slug,
        count,
        label: citySlugMap.get(slug) ?? slug,
      }))
  }, [progressSummaries])

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">Account</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Create an account to sync your Metro Memory progress and achievements securely across
          devices.
        </p>
      </div>

      {user ? (
        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            Signed in as {user.email}
          </h2>
          {progressEntries.length > 0 ? (
            <div className="mt-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Synced cities
              </h3>
              <ul className="mt-2 space-y-1 text-sm text-zinc-700 dark:text-zinc-200">
                {progressEntries.map((entry) => (
                  <li key={entry.slug} className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-800/60">
                    <span>{entry.label}</span>
                    <span className="font-semibold">{entry.count} station{entry.count === 1 ? '' : 's'}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
              You haven&apos;t synced any cities yet. Play a city to start saving your progress.
            </p>
          )}
          <button
            onClick={handleLogout}
            className="mt-6 inline-flex items-center justify-center rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Log out
          </button>
        </section>
      ) : (
        <div className="grid gap-8 md:grid-cols-2">
          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Create account</h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Passwords are hashed server-side. You&apos;ll just need to verify your email before syncing.
            </p>
            <form className="mt-4 space-y-3" onSubmit={handleRegister}>
              <input
                required
                type="email"
                name="registerEmail"
                placeholder="Email"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
              />
              <input
                required
                type="password"
                name="registerPassword"
                placeholder="Password (min 8 chars)"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
              />
              <input
                required
                type="password"
                name="registerConfirmPassword"
                placeholder="Confirm password"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
              />
              {registerState.type !== 'idle' && (
                <p
                  className={`text-sm ${
                    registerState.type === 'error'
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {registerState.message}
                </p>
              )}
              <button
                type="submit"
                className="w-full rounded-full bg-[var(--accent-600)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--accent-500)] dark:bg-[var(--accent-600)] dark:hover:bg-[var(--accent-500)]"
              >
                Sign up
              </button>
            </form>
          </section>
          <section className="space-y-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Sign in</h2>
              <form className="mt-4 space-y-3" onSubmit={handleLogin}>
                <input
                  required
                  type="email"
                  name="loginEmail"
                  placeholder="Email"
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                />
                <input
                  required
                  type="password"
                  name="loginPassword"
                  placeholder="Password"
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                />
                {loginState.type !== 'idle' && (
                  <p
                    className={`text-sm ${
                      loginState.type === 'error'
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {loginState.message}
                  </p>
                )}
                <button
                  type="submit"
                  className="w-full rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  Log in
                </button>
              </form>
            </div>
          </section>
        </div>
      )}

      {loading && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Checking your account status…
        </p>
      )}
    </div>
  )
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Msg = { role: 'user' | 'assistant'; content: string }

export default function ChatConsole() {
  const router = useRouter()
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const send = async () => {
    const message = input.trim()
    if (!message || busy) return
    setError(null)
    setBusy(true)
    setInput('')
    setMessages((m) => [...m, { role: 'user', content: message }])

    try {
      const res = await fetch('/api/admin/research/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, sessionId }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(payload?.error ?? 'Chat request failed.')
      }
      setSessionId(payload.sessionId ?? sessionId)
      setMessages((m) => [
        ...m,
        { role: 'assistant', content: payload.assistantContent ?? '(no response)' },
      ])
      if (payload.runId) router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chat request failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex h-[32rem] flex-col rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center text-sm text-zinc-400">
            <p>Ask the research agent to investigate cities.</p>
            <p className="mt-1 text-xs">e.g. &ldquo;Research Tokyo and Osaka for station openings&rdquo;</p>
          </div>
        ) : (
          messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm ${
                  m.role === 'user'
                    ? 'bg-sky-500 text-white'
                    : 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100'
                }`}
              >
                {m.content}
              </div>
            </div>
          ))
        )}
        {busy && <p className="text-xs text-zinc-400">Researching…</p>}
      </div>

      {error ? (
        <p className="px-4 text-xs text-rose-500">{error}</p>
      ) : null}

      <div className="flex gap-2 border-t border-zinc-200 p-3 dark:border-zinc-800">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              void send()
            }
          }}
          placeholder="Type a research request…"
          disabled={busy}
          className="flex-1 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm outline-none focus:border-sky-400 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950"
        />
        <button
          type="button"
          onClick={() => void send()}
          disabled={busy || !input.trim()}
          className="rounded-xl bg-sky-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-sky-400 disabled:opacity-60"
        >
          Send
        </button>
      </div>
    </div>
  )
}

'use client'

import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

type SessionSummary = {
  id: string
  title: string | null
  updatedAt: string
  archivedAt?: string | null
  _count?: { messages: number }
}
type Message = { id: string; role: 'USER' | 'ASSISTANT' | 'SYSTEM'; content: string }

const ACTIVE_KEY = 'research-chat-active-session'
const STREAM_ID = '__streaming__'

function isRealMessage(id: string) {
  return id !== STREAM_ID && !id.startsWith('tmp-')
}

export default function ChatConsole() {
  const router = useRouter()
  const [sessions, setSessions] = useState<SessionSummary[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameText, setRenameText] = useState('')
  // Chat about to be deleted from the sidebar (shows a confirm dialog).
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  // Archived-chats management modal state.
  const [showArchived, setShowArchived] = useState(false)
  const [archivedSessions, setArchivedSessions] = useState<SessionSummary[]>([])
  const [archivedLoading, setArchivedLoading] = useState(false)
  // Archived chat about to be permanently deleted (shows a confirm dialog).
  const [confirmPurgeId, setConfirmPurgeId] = useState<string | null>(null)
  // Undo toast: { message, onUndo }. The pending server action (e.g. the actual
  // delete) is held in a ref and committed after 5s unless undone.
  const [toast, setToast] = useState<{ message: string; onUndo: () => void } | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingExpire = useRef<(() => void) | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const refreshSessions = useCallback(async () => {
    const res = await fetch('/api/admin/research/sessions')
    if (res.ok) setSessions((await res.json()).sessions ?? [])
  }, [])

  const loadSession = useCallback(async (id: string | null) => {
    setActiveId(id)
    setEditingId(null)
    setError(null)
    if (typeof window !== 'undefined') {
      if (id) window.localStorage.setItem(ACTIVE_KEY, id)
      else window.localStorage.removeItem(ACTIVE_KEY)
    }
    if (!id) {
      setMessages([])
      return
    }
    try {
      const res = await fetch(`/api/admin/research/sessions/${id}`)
      if (!res.ok) {
        const p = await res.json().catch(() => ({}))
        setError(p?.error ?? `Could not load chat (HTTP ${res.status}).`)
        setMessages([])
        return
      }
      const data = await res.json()
      setMessages(data.session?.messages ?? [])
    } catch {
      setError('Could not load chat.')
      setMessages([])
    }
  }, [])

  useEffect(() => {
    ;(async () => {
      await refreshSessions()
      const stored = typeof window !== 'undefined' ? window.localStorage.getItem(ACTIVE_KEY) : null
      if (stored) await loadSession(stored)
    })()
  }, [refreshSessions, loadSession])

  // Keep the message list pinned to the bottom by scrolling ONLY its own
  // container — never scrollIntoView, which would scroll the whole page.
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, busy])

  const fail = async (res: Response, fallback: string) => {
    const p = await res.json().catch(() => ({}))
    setError(p?.error ?? fallback)
  }

  // Commit any pending deferred action immediately (clears the timer).
  const flushPending = useCallback(() => {
    if (toastTimer.current) {
      clearTimeout(toastTimer.current)
      toastTimer.current = null
    }
    const fn = pendingExpire.current
    pendingExpire.current = null
    fn?.()
  }, [])

  // Show an undo toast. `onExpire` runs after 5s unless the user hits Undo, which
  // runs `onUndo` instead. Starting a new toast commits any previous pending action.
  const showToast = useCallback(
    (message: string, opts: { onUndo?: () => void; onExpire?: () => void }) => {
      flushPending()
      pendingExpire.current = opts.onExpire ?? null
      setToast({
        message,
        onUndo: () => {
          if (toastTimer.current) {
            clearTimeout(toastTimer.current)
            toastTimer.current = null
          }
          pendingExpire.current = null
          setToast(null)
          opts.onUndo?.()
        },
      })
      toastTimer.current = setTimeout(() => {
        toastTimer.current = null
        const fn = pendingExpire.current
        pendingExpire.current = null
        setToast(null)
        fn?.()
      }, 5000)
    },
    [flushPending],
  )

  // Commit any pending delete if the console unmounts.
  useEffect(() => () => flushPending(), [flushPending])

  const send = async () => {
    const message = input.trim()
    if (!message || busy) return
    setError(null)
    setBusy(true)
    setInput('')
    setMessages((m) => [
      ...m,
      { id: `tmp-u-${Date.now()}`, role: 'USER', content: message },
      { id: STREAM_ID, role: 'ASSISTANT', content: '' },
    ])

    try {
      const res = await fetch('/api/admin/research/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, sessionId: activeId }),
      })
      if (!res.ok || !res.body) {
        await fail(res, 'Chat request failed.')
        setMessages((m) => m.filter((x) => x.id !== STREAM_ID))
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let sid = activeId
      let runId: string | null = null

      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const parts = buffer.split('\n\n')
        buffer = parts.pop() ?? ''
        for (const part of parts) {
          const line = part.trim()
          if (!line.startsWith('data:')) continue
          let obj: any
          try {
            obj = JSON.parse(line.slice(5).trim())
          } catch {
            continue
          }
          if (obj.type === 'delta') {
            setMessages((m) => {
              const copy = [...m]
              const last = copy[copy.length - 1]
              if (last && last.id === STREAM_ID) {
                copy[copy.length - 1] = { ...last, content: last.content + obj.delta }
              }
              return copy
            })
          } else if (obj.type === 'done') {
            sid = obj.sessionId
            runId = obj.runId
          } else if (obj.type === 'error') {
            setError(obj.error ?? 'Chat failed.')
          }
        }
      }

      if (sid) {
        if (typeof window !== 'undefined') window.localStorage.setItem(ACTIVE_KEY, sid)
        await loadSession(sid)
        await refreshSessions()
      }
      if (runId) router.refresh()
    } catch {
      setError('Chat request failed.')
    } finally {
      setBusy(false)
    }
  }

  const newChat = async () => {
    setError(null)
    const res = await fetch('/api/admin/research/sessions', { method: 'POST' })
    if (!res.ok) return fail(res, 'Could not create chat.')
    const { session } = await res.json()
    await refreshSessions()
    await loadSession(session.id)
  }

  const refreshArchived = useCallback(async () => {
    setArchivedLoading(true)
    try {
      const res = await fetch('/api/admin/research/sessions?archived=1')
      if (res.ok) setArchivedSessions((await res.json()).sessions ?? [])
    } finally {
      setArchivedLoading(false)
    }
  }, [])

  const removeChat = (id: string) => {
    setConfirmDeleteId(null)
    // Optimistically remove; actually delete on the server after the undo window.
    setSessions((prev) => prev.filter((s) => s.id !== id))
    if (id === activeId) void loadSession(null)
    showToast('Chat deleted.', {
      onUndo: () => void refreshSessions(),
      onExpire: async () => {
        await fetch(`/api/admin/research/sessions/${id}`, { method: 'DELETE' }).catch(() => {})
        void refreshSessions()
      },
    })
  }

  const archiveChat = async (id: string) => {
    setError(null)
    const res = await fetch(`/api/admin/research/sessions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ archived: true }),
    })
    if (!res.ok) return fail(res, 'Could not archive chat.')
    await refreshSessions()
    if (id === activeId) await loadSession(null)
    if (showArchived) await refreshArchived()
    showToast('Chat archived.', { onUndo: () => void unarchiveChat(id) })
  }

  const unarchiveChat = async (id: string) => {
    setError(null)
    const res = await fetch(`/api/admin/research/sessions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ archived: false }),
    })
    if (!res.ok) return fail(res, 'Could not unarchive chat.')
    await Promise.all([refreshSessions(), refreshArchived()])
  }

  const purgeChat = (id: string) => {
    setConfirmPurgeId(null)
    // Optimistically remove from the archived list; delete on the server after undo.
    setArchivedSessions((prev) => prev.filter((s) => s.id !== id))
    showToast('Chat permanently deleted.', {
      onUndo: () => void refreshArchived(),
      onExpire: async () => {
        await fetch(`/api/admin/research/sessions/${id}`, { method: 'DELETE' }).catch(() => {})
        void refreshArchived()
        void refreshSessions()
      },
    })
  }

  const openArchived = async () => {
    setShowArchived(true)
    await refreshArchived()
  }

  const saveRename = async (id: string) => {
    const title = renameText.trim()
    setRenamingId(null)
    if (!title) return
    const res = await fetch(`/api/admin/research/sessions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    })
    if (!res.ok) return fail(res, 'Rename failed.')
    await refreshSessions()
  }

  const deleteMessage = async (id: string) => {
    const res = await fetch(`/api/admin/research/messages/${id}`, { method: 'DELETE' })
    if (!res.ok) return fail(res, 'Delete failed.')
    await loadSession(activeId)
  }

  const saveEdit = async (id: string) => {
    const content = editText.trim()
    if (!content) return
    setEditingId(null)
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/research/messages/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      if (!res.ok) return fail(res, 'Edit failed.')
      await loadSession(activeId)
      await refreshSessions()
    } finally {
      setBusy(false)
    }
  }

  const branch = async (messageId: string) => {
    setError(null)
    const res = await fetch(`/api/admin/research/sessions/${activeId}/branch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageId }),
    })
    if (!res.ok) return fail(res, 'Branch failed.')
    const { sessionId } = await res.json()
    await refreshSessions()
    await loadSession(sessionId)
  }

  return (
    <div className="flex h-[34rem] overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      {/* Sidebar */}
      <aside className="flex w-60 shrink-0 flex-col border-r border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950/50">
        <button
          type="button"
          onClick={newChat}
          className="m-2 rounded-xl bg-sky-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-sky-400"
        >
          + New chat
        </button>
        <div className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-2">
          {sessions.length === 0 && (
            <p className="px-2 py-4 text-center text-xs text-zinc-400">No chats yet.</p>
          )}
          {sessions.map((s) => (
            <div
              key={s.id}
              className={`group flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm ${
                s.id === activeId
                  ? 'bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200'
                  : 'text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800'
              }`}
            >
              {renamingId === s.id ? (
                <input
                  autoFocus
                  value={renameText}
                  onChange={(e) => setRenameText(e.target.value)}
                  onBlur={() => saveRename(s.id)}
                  onKeyDown={(e) => e.key === 'Enter' && saveRename(s.id)}
                  className="w-full rounded border border-zinc-300 bg-white px-1 py-0.5 text-xs dark:border-zinc-600 dark:bg-zinc-900"
                />
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => loadSession(s.id)}
                    onDoubleClick={() => {
                      setRenamingId(s.id)
                      setRenameText(s.title ?? '')
                    }}
                    className="flex-1 truncate text-left"
                    title={s.title ?? 'Untitled'}
                  >
                    {s.title || 'Untitled'}
                  </button>
                  <button
                    type="button"
                    onClick={() => archiveChat(s.id)}
                    className="opacity-0 transition group-hover:opacity-100 hover:text-sky-500"
                    title="Archive chat"
                  >
                    {/* archive box icon */}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="h-4 w-4"
                      aria-hidden="true"
                    >
                      <path d="M3 4.5A1.5 1.5 0 0 1 4.5 3h11A1.5 1.5 0 0 1 17 4.5v1A1.5 1.5 0 0 1 15.5 7h-11A1.5 1.5 0 0 1 3 5.5v-1Z" />
                      <path
                        fillRule="evenodd"
                        d="M4 8h12v6.5A1.5 1.5 0 0 1 14.5 16h-9A1.5 1.5 0 0 1 4 14.5V8Zm4 2.25c0-.414.336-.75.75-.75h2.5a.75.75 0 0 1 0 1.5h-2.5a.75.75 0 0 1-.75-.75Z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(s.id)}
                    className="opacity-0 transition group-hover:opacity-100 hover:text-rose-500"
                    title="Delete chat"
                  >
                    ✕
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={openArchived}
          className="m-2 rounded-xl border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-600 transition hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Archived chats
        </button>
      </aside>

      {/* Main pane */}
      <div className="flex flex-1 flex-col">
        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center text-sm text-zinc-400">
              <p>Ask about your queue, or start a research run.</p>
              <p className="mt-1 text-xs">
                e.g. &ldquo;What&apos;s in my queue?&rdquo; · &ldquo;Research Tokyo for station openings&rdquo;
              </p>
            </div>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className={`group flex flex-col ${m.role === 'USER' ? 'items-end' : 'items-start'}`}
              >
                {editingId === m.id ? (
                  <div className="w-full max-w-[85%]">
                    <textarea
                      autoFocus
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      rows={3}
                      className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
                    />
                    <div className="mt-1 flex gap-2">
                      <button
                        type="button"
                        onClick={() => saveEdit(m.id)}
                        className="rounded-lg bg-sky-500 px-3 py-1 text-xs font-semibold text-white hover:bg-sky-400"
                      >
                        Save &amp; regenerate
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="rounded-lg bg-zinc-200 px-3 py-1 text-xs font-semibold text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div
                      className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm ${
                        m.role === 'USER'
                          ? 'bg-sky-500 text-white'
                          : 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100'
                      }`}
                    >
                      {m.content || (m.id === STREAM_ID ? '▍' : '')}
                    </div>
                    {isRealMessage(m.id) && (
                      <div className="mt-1 flex gap-2 text-xs text-zinc-400 opacity-0 transition group-hover:opacity-100">
                        {m.role === 'USER' && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(m.id)
                              setEditText(m.content)
                            }}
                            className="hover:text-sky-500"
                          >
                            Edit
                          </button>
                        )}
                        <button type="button" onClick={() => branch(m.id)} className="hover:text-sky-500">
                          Branch
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteMessage(m.id)}
                          className="hover:text-rose-500"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))
          )}
        </div>

        {error ? <p className="px-4 text-xs text-rose-500">{error}</p> : null}

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
            placeholder="Message the research agent…"
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

      {/* Confirm: delete an active chat */}
      {confirmDeleteId && (
        <Modal onClose={() => setConfirmDeleteId(null)}>
          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Delete chat?</h3>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            “{sessions.find((s) => s.id === confirmDeleteId)?.title || 'Untitled'}” will be permanently
            deleted. This can’t be undone. To keep it, archive it instead.
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setConfirmDeleteId(null)}
              className="rounded-lg bg-zinc-200 px-3 py-1.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-600"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => removeChat(confirmDeleteId)}
              className="rounded-lg bg-rose-500 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-rose-400"
            >
              Delete
            </button>
          </div>
        </Modal>
      )}

      {/* Archived chats manager */}
      {showArchived && (
        <Modal onClose={() => setShowArchived(false)}>
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Archived chats</h3>
            <button
              type="button"
              onClick={() => setShowArchived(false)}
              className="text-zinc-400 transition hover:text-zinc-600 dark:hover:text-zinc-200"
              title="Close"
            >
              ✕
            </button>
          </div>
          <div className="mt-3 max-h-72 space-y-1 overflow-y-auto">
            {archivedLoading ? (
              <p className="py-6 text-center text-sm text-zinc-400">Loading…</p>
            ) : archivedSessions.length === 0 ? (
              <p className="py-6 text-center text-sm text-zinc-400">No archived chats.</p>
            ) : (
              archivedSessions.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-800"
                >
                  <span
                    className="flex-1 truncate text-sm text-zinc-700 dark:text-zinc-300"
                    title={s.title ?? 'Untitled'}
                  >
                    {s.title || 'Untitled'}
                  </span>
                  <button
                    type="button"
                    onClick={() => unarchiveChat(s.id)}
                    className="rounded-lg bg-sky-500 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-sky-400"
                  >
                    Unarchive
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmPurgeId(s.id)}
                    className="rounded-lg bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-600 transition hover:bg-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:hover:bg-rose-900"
                  >
                    Delete
                  </button>
                </div>
              ))
            )}
          </div>
        </Modal>
      )}

      {/* Confirm: permanently delete an archived chat */}
      {confirmPurgeId && (
        <Modal onClose={() => setConfirmPurgeId(null)}>
          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            Permanently delete chat?
          </h3>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            “{archivedSessions.find((s) => s.id === confirmPurgeId)?.title || 'Untitled'}” and all its
            messages will be permanently deleted. This can’t be undone.
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setConfirmPurgeId(null)}
              className="rounded-lg bg-zinc-200 px-3 py-1.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-600"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => purgeChat(confirmPurgeId)}
              className="rounded-lg bg-rose-500 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-rose-400"
            >
              Delete permanently
            </button>
          </div>
        </Modal>
      )}

      {/* Undo toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[60] w-72 -translate-x-1/2">
          <style>{`@keyframes rc_toastbar{from{width:100%}to{width:0%}}`}</style>
          <div className="flex items-center gap-4 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm text-white shadow-xl dark:bg-zinc-100 dark:text-zinc-900">
            <span className="flex-1">{toast.message}</span>
            <button
              type="button"
              onClick={toast.onUndo}
              className="font-semibold text-sky-400 transition hover:text-sky-300 dark:text-sky-600 dark:hover:text-sky-500"
            >
              Undo
            </button>
          </div>
          <div className="mt-1 h-0.5 overflow-hidden rounded-full bg-zinc-700/40 dark:bg-zinc-400/40">
            <div
              className="h-full bg-sky-400"
              style={{ animation: 'rc_toastbar 5s linear forwards' }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

function Modal({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-800 dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}

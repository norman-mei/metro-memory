'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

type ResearchFollowUpActionsProps = {
  claimId: string
  latestTaskId?: string | null
}

export default function ResearchFollowUpActions({
  claimId,
  latestTaskId,
}: ResearchFollowUpActionsProps) {
  const router = useRouter()
  const [reason, setReason] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const submit = (action: 'rerun' | 'markBlocked' | 'markExhausted' | 'blockTask') => {
    startTransition(async () => {
      setMessage(null)
      const response = await fetch(`/api/admin/automation/research/${claimId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          reason: reason.trim() || null,
          taskId: action === 'blockTask' ? latestTaskId : null,
        }),
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        setMessage(payload?.error || 'Research action failed.')
        return
      }

      setMessage('Saved')
      router.refresh()
    })
  }

  return (
    <div className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950/70">
      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
        AI follow-up controls
      </div>
      <textarea
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        rows={3}
        className="w-full rounded-xl border border-zinc-200/50 bg-white/50 px-3 shadow-inner backdrop-blur py-2 text-sm text-zinc-900 outline-none transition focus:border-sky-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        placeholder="Optional operator reason"
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={isPending}
          onClick={() => submit('rerun')}
          className="rounded-xl bg-sky-500 px-3 py-2 text-sm font-semibold text-zinc-950 disabled:opacity-60"
        >
          Rerun follow-up
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => submit('markExhausted')}
          className="rounded-xl bg-amber-500 px-3 py-2 text-sm font-semibold text-zinc-950 disabled:opacity-60"
        >
          Mark exhausted
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => submit('markBlocked')}
          className="rounded-xl bg-rose-500 px-3 py-2 text-sm font-semibold text-rose-950 disabled:opacity-60"
        >
          Mark blocked
        </button>
        {latestTaskId ? (
          <button
            type="button"
            disabled={isPending}
            onClick={() => submit('blockTask')}
            className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-800 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          >
            Block latest task
          </button>
        ) : null}
      </div>
      {message ? (
        <p className="text-xs text-zinc-600 dark:text-zinc-400">{message}</p>
      ) : null}
    </div>
  )
}

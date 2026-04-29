'use client'

import { AutomationDecisionStatus } from '@prisma/client'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

type CandidateReviewActionsProps = {
  candidateId: string
  currentStatus: AutomationDecisionStatus
  currentNote: string | null
}

export default function CandidateReviewActions({
  candidateId,
  currentStatus,
  currentNote,
}: CandidateReviewActionsProps) {
  const router = useRouter()
  const [note, setNote] = useState(currentNote || '')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [status, setStatus] = useState(currentStatus)

  const submit = async (nextStatus: AutomationDecisionStatus) => {
    setError(null)
    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/admin/automation/candidates/${candidateId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: nextStatus,
          note,
        }),
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error ?? 'Review update failed.')
      }

      setStatus(nextStatus)
      startTransition(() => {
        router.refresh()
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950/70">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
          Decision
        </span>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
            status === AutomationDecisionStatus.APPROVED
              ? 'bg-emerald-950 text-emerald-300'
              : status === AutomationDecisionStatus.REJECTED
                ? 'bg-rose-950 text-rose-300'
              : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200'
          }`}
        >
          {status.toLowerCase()}
        </span>
      </div>

      <textarea
        value={note}
        onChange={(event) => setNote(event.target.value)}
        rows={3}
        className="w-full rounded-xl border border-zinc-200/50 bg-white/50 px-3 shadow-inner backdrop-blur py-2 text-sm text-zinc-900 outline-none transition focus:border-sky-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        placeholder="Optional review note"
      />

      {error ? <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p> : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={isPending || isSubmitting}
          onClick={() =>
            submit(AutomationDecisionStatus.APPROVED).catch((submitError) => {
              setError(
                submitError instanceof Error
                  ? submitError.message
                  : 'Review update failed.',
              )
            })
          }
          className="rounded-xl bg-emerald-500 px-3 py-2 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Approve
        </button>
        <button
          type="button"
          disabled={isPending || isSubmitting}
          onClick={() =>
            submit(AutomationDecisionStatus.REJECTED).catch((submitError) => {
              setError(
                submitError instanceof Error
                  ? submitError.message
                  : 'Review update failed.',
              )
            })
          }
          className="rounded-xl bg-rose-500 px-3 py-2 text-sm font-semibold text-rose-950 transition hover:bg-rose-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Reject
        </button>
      </div>
    </div>
  )
}

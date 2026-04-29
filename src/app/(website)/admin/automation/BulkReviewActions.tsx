'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState, useTransition } from 'react'

type BulkReviewCandidate = {
  id: string
  title: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  appliedAt?: string | null
  likelyRealTransitLine?: boolean
  hasConflict?: boolean
  trustBlocked?: boolean
  clusterSize?: number
}

type BulkReviewActionsProps = {
  runId: string
  candidates: BulkReviewCandidate[]
}

export default function BulkReviewActions({
  runId,
  candidates,
}: BulkReviewActionsProps) {
  const router = useRouter()
  const [selectedIds, setSelectedIds] = useState<string[]>(candidates.map((candidate) => candidate.id))
  const [note, setNote] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isPending, startTransition] = useTransition()

  const disabled = selectedIds.length === 0 || isSubmitting || isPending

  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds])

  const toggleSelection = (candidateId: string, checked: boolean) => {
    setSelectedIds((previous) => {
      if (checked) {
        return previous.includes(candidateId) ? previous : [...previous, candidateId]
      }
      return previous.filter((value) => value !== candidateId)
    })
  }

  const selectAll = () => {
    setSelectedIds(candidates.map((candidate) => candidate.id))
  }

  const clearAll = () => {
    setSelectedIds([])
  }

  const selectMatching = (predicate: (candidate: BulkReviewCandidate) => boolean) => {
    setSelectedIds(candidates.filter(predicate).map((candidate) => candidate.id))
  }

  const submit = async (status: 'APPROVED' | 'REJECTED') => {
    setError(null)
    setMessage(null)
    setIsSubmitting(true)

    try {
      const formData = new FormData()
      formData.set('status', status)
      formData.set('note', note)
      selectedIds.forEach((candidateId) => formData.append('candidateIds', candidateId))

      const response = await fetch('/api/admin/automation/bulk-review', {
        method: 'POST',
        body: formData,
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error ?? 'Bulk review failed.')
      }

      setMessage(
        `${status === 'APPROVED' ? 'Approved' : 'Rejected'} ${payload?.updatedCount ?? 0} candidate(s) in run ${runId}.`,
      )
      startTransition(() => {
        router.refresh()
      })
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : 'Bulk review failed.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-200/60 bg-white/50 p-4 backdrop-blur shadow-sm transition hover:shadow-md dark:border-white/5 dark:bg-zinc-900/50">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-500">
            Bulk review
          </div>
          <div className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
            {selectedIds.length} selected
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={selectAll}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
          >
            Select all
          </button>
          <button
            type="button"
            onClick={clearAll}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => selectMatching((candidate) => candidate.status === 'PENDING')}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
        >
          Visible pending
        </button>
        <button
          type="button"
          onClick={() =>
            selectMatching(
              (candidate) =>
                candidate.status === 'PENDING' && Boolean(candidate.likelyRealTransitLine),
            )
          }
          className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
        >
          Likely real
        </button>
        <button
          type="button"
          onClick={() =>
            selectMatching(
              (candidate) => candidate.status === 'PENDING' && Boolean(candidate.hasConflict),
            )
          }
          className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
        >
          Conflicts
        </button>
        <button
          type="button"
          onClick={() =>
            selectMatching(
              (candidate) => candidate.status === 'PENDING' && Boolean(candidate.trustBlocked),
            )
          }
          className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
        >
          Trust-blocked
        </button>
        <button
          type="button"
          onClick={() =>
            selectMatching(
              (candidate) =>
                candidate.status === 'APPROVED' && !candidate.appliedAt,
            )
          }
          className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
        >
          Ready to apply
        </button>
        <button
          type="button"
          onClick={() =>
            selectMatching(
              (candidate) => candidate.status === 'PENDING' && (candidate.clusterSize || 0) > 1,
            )
          }
          className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
        >
          Grouped duplicates
        </button>
      </div>

      <textarea
        value={note}
        onChange={(event) => setNote(event.target.value)}
        rows={2}
        className="mb-3 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-sky-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        placeholder="Optional bulk review note"
      />

      <div className="mb-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            submit('APPROVED').catch(() => undefined)
          }}
          className="rounded-xl bg-emerald-500 px-3 py-2 text-sm font-semibold text-emerald-950 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Approve selected
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            submit('REJECTED').catch(() => undefined)
          }}
          className="rounded-xl bg-rose-500 px-3 py-2 text-sm font-semibold text-rose-950 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Reject selected
        </button>
      </div>

      {message ? <p className="mb-3 text-xs text-emerald-300">{message}</p> : null}
      {error ? <p className="mb-3 text-xs text-rose-300">{error}</p> : null}

      <div className="max-h-40 space-y-2 overflow-y-auto pr-1">
        {candidates.map((candidate) => (
          <label
            key={candidate.id}
          className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-300"
          >
            <input
              type="checkbox"
              checked={selectedIdSet.has(candidate.id)}
              onChange={(event) => toggleSelection(candidate.id, event.target.checked)}
            />
            <span className="font-mono">{candidate.id}</span>
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
              {candidate.status.toLowerCase()}
            </span>
            {candidate.appliedAt ? (
              <span className="rounded-full bg-sky-950 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-sky-300">
                applied
              </span>
            ) : null}
            {candidate.hasConflict ? (
              <span className="rounded-full bg-amber-950 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-amber-300">
                conflict
              </span>
            ) : null}
            {candidate.trustBlocked ? (
              <span className="rounded-full bg-rose-950 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-rose-300">
                blocked
              </span>
            ) : null}
            {candidate.clusterSize && candidate.clusterSize > 1 ? (
              <span className="rounded-full bg-violet-950 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-violet-300">
                grouped {candidate.clusterSize}
              </span>
            ) : null}
            <span className="truncate text-zinc-500 dark:text-zinc-400">{candidate.title}</span>
          </label>
        ))}
      </div>
    </div>
  )
}

'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

type RevertRunButtonProps = {
  runId: string
  disabled?: boolean
}

export default function RevertRunButton({ runId, disabled = false }: RevertRunButtonProps) {
  const router = useRouter()
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isPending, startTransition] = useTransition()

  const isDisabled = disabled || isSubmitting || isPending

  const handleRevert = async () => {
    setError(null)
    setMessage(null)
    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/admin/automation/runs/${runId}/revert`, {
        method: 'POST',
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error ?? 'Revert failed.')
      }

      setMessage(
        payload?.git?.pullRequestUrl
          ? `Opened revert PR #${payload?.git?.pullRequestNumber ?? ''}.`
          : 'Created revert branch/commit.',
      )
      startTransition(() => {
        router.refresh()
      })
    } catch (revertError) {
      setError(revertError instanceof Error ? revertError.message : 'Revert failed.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={isDisabled}
        onClick={() => {
          handleRevert().catch(() => undefined)
        }}
        className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200 dark:hover:bg-rose-500/20"
      >
        {isSubmitting ? 'Creating revert…' : 'Open revert PR'}
      </button>
      {message ? <p className="text-xs text-emerald-600 dark:text-emerald-300">{message}</p> : null}
      {error ? <p className="text-xs text-rose-600 dark:text-rose-300">{error}</p> : null}
    </div>
  )
}

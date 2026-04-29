'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

type QuickBulkReviewButtonProps = {
  candidateIds: string[]
  status: 'APPROVED' | 'REJECTED'
  label: string
  note: string
  className?: string
}

export default function QuickBulkReviewButton({
  candidateIds,
  status,
  label,
  note,
  className,
}: QuickBulkReviewButtonProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const disabled = candidateIds.length === 0 || isSubmitting || isPending

  const submit = async () => {
    setError(null)
    setIsSubmitting(true)

    try {
      const formData = new FormData()
      formData.set('status', status)
      formData.set('note', note)
      candidateIds.forEach((candidateId) => formData.append('candidateIds', candidateId))

      const response = await fetch('/api/admin/automation/bulk-review', {
        method: 'POST',
        body: formData,
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error ?? 'Bulk review failed.')
      }

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
    <div className="space-y-1">
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          submit().catch(() => undefined)
        }}
        className={className}
      >
        {isSubmitting ? 'Working…' : label}
      </button>
      {error ? <p className="text-xs text-rose-600 dark:text-rose-300">{error}</p> : null}
    </div>
  )
}

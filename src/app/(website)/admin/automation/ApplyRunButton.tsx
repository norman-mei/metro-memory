'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import type { AutomationApplyWorkflowStatus } from '@/lib/automationWorkflowStatus'

type ApplyRunButtonProps = {
  runId: string
  approvedCount: number
  pendingApplyCount: number
  workflowStatus: AutomationApplyWorkflowStatus | null
}

export default function ApplyRunButton({
  runId,
  approvedCount,
  pendingApplyCount,
  workflowStatus,
}: ApplyRunButtonProps) {
  const router = useRouter()
  const [message, setMessage] = useState<string | null>(null)
  const [actionsUrl, setActionsUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isPending, startTransition] = useTransition()

  const workflowActive =
    workflowStatus?.state === 'queued' || workflowStatus?.state === 'in_progress'
  const disabled =
    approvedCount === 0 ||
    pendingApplyCount === 0 ||
    isSubmitting ||
    isPending ||
    workflowActive

  const statusTone =
    workflowStatus?.state === 'completed'
      ? workflowStatus.conclusion === 'success'
        ? 'text-emerald-600 dark:text-emerald-300'
        : 'text-rose-600 dark:text-rose-300'
      : workflowStatus?.state === 'in_progress'
        ? 'text-sky-600 dark:text-sky-300'
        : workflowStatus?.state === 'queued'
          ? 'text-amber-600 dark:text-amber-300'
          : 'text-zinc-500 dark:text-zinc-400'

  const statusLabel =
    workflowStatus?.state === 'queued'
      ? 'Apply workflow queued in GitHub Actions.'
      : workflowStatus?.state === 'in_progress'
        ? 'Apply workflow is running in GitHub Actions.'
        : workflowStatus?.state === 'completed'
          ? workflowStatus.conclusion === 'success'
            ? 'Latest apply workflow finished successfully.'
            : `Latest apply workflow finished with ${workflowStatus.conclusion || 'an error'}.`
          : null

  const handleApply = async () => {
    setError(null)
    setMessage(null)
    setActionsUrl(null)
    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/admin/automation/runs/${runId}/apply`, {
        method: 'POST',
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        if (payload?.workflowStatus?.actionsUrl) {
          setActionsUrl(payload.workflowStatus.actionsUrl)
        }
        throw new Error(payload?.error ?? 'Apply failed.')
      }

      if (payload?.mode === 'github-actions' && payload?.queued) {
        setMessage(
          `Queued GitHub Actions apply workflow for run ${runId}. The branch and PR will be created by Actions.`,
        )
        setActionsUrl(payload?.actionsUrl ?? null)
      } else {
        setMessage(
          payload?.git?.pullRequestUrl
            ? `Applied ${payload?.appliedCount ?? 0} candidate(s) and opened PR #${payload?.git?.pullRequestNumber ?? ''}.`
            : `Applied ${payload?.appliedCount ?? 0} candidate(s), skipped ${payload?.skippedCount ?? 0}.`,
        )
      }
      startTransition(() => {
        router.refresh()
      })
    } catch (applyError) {
      setError(applyError instanceof Error ? applyError.message : 'Apply failed.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          handleApply().catch((applyError) => {
            setError(
              applyError instanceof Error ? applyError.message : 'Apply failed.',
            )
          })
        }}
        className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting
          ? 'Applying…'
          : workflowActive
            ? 'Apply queued'
            : 'Apply approved changes'}
      </button>
      {statusLabel ? <p className={`text-xs ${statusTone}`}>{statusLabel}</p> : null}
      {message ? <p className="text-xs text-emerald-600 dark:text-emerald-300">{message}</p> : null}
      {actionsUrl || workflowStatus?.runUrl || workflowStatus?.actionsUrl ? (
        <p className="text-xs text-sky-600 dark:text-sky-300">
          <Link
            href={actionsUrl || workflowStatus?.runUrl || workflowStatus?.actionsUrl || '#'}
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2"
          >
            {workflowStatus?.runUrl ? 'Open workflow run' : 'Open GitHub Actions workflow'}
          </Link>
        </p>
      ) : null}
      {error ? <p className="text-xs text-rose-600 dark:text-rose-300">{error}</p> : null}
    </div>
  )
}

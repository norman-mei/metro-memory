'use client'

import { useState, useTransition } from 'react'

type TrustOverrideFormProps = {
  kind: 'domain' | 'city' | 'claimType'
  itemKey: string
  title: string
  currentTrustScore?: number | null
  currentManualTrustScore?: number | null
  currentBlocked?: boolean | null
  currentManualBlocked?: boolean | null
  currentForcedLane?: 'GREEN' | 'YELLOW' | 'RED' | null
  currentOverrideReason?: string | null
}

export default function TrustOverrideForm({
  kind,
  itemKey,
  title,
  currentTrustScore,
  currentManualTrustScore,
  currentBlocked,
  currentManualBlocked,
  currentForcedLane,
  currentOverrideReason,
}: TrustOverrideFormProps) {
  const [trustScore, setTrustScore] = useState(
    currentManualTrustScore != null ? String(Math.round(currentManualTrustScore * 100)) : '',
  )
  const [blocked, setBlocked] = useState(Boolean(currentManualBlocked ?? currentBlocked))
  const [forcedLane, setForcedLane] = useState(currentForcedLane || '')
  const [overrideReason, setOverrideReason] = useState(currentOverrideReason || '')
  const [message, setMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = () => {
    startTransition(async () => {
      setMessage(null)
      const response = await fetch('/api/admin/automation/trust', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          kind,
          key: itemKey,
          manualTrustScore: trustScore.trim() ? Number(trustScore) / 100 : null,
          manualBlocked: kind === 'domain' ? blocked : null,
          forcedLane: kind === 'claimType' ? forcedLane || null : null,
          overrideReason: overrideReason.trim() || null,
        }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        setMessage(payload?.error || 'Override update failed.')
        return
      }

      setMessage('Saved')
      window.location.reload()
    })
  }

  return (
    <div className="rounded-xl border border-zinc-200/80 bg-white/80 p-3 shadow-sm backdrop-blur transition hover:shadow-md dark:border-white/10 dark:bg-zinc-900/60">
      <div className="mb-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">{title}</div>
      <div className="space-y-2">
        <input
          type="number"
          min="0"
          max="100"
          step="1"
          value={trustScore}
          onChange={(event) => setTrustScore(event.target.value)}
          placeholder={`Manual trust override (${currentTrustScore != null ? Math.round(currentTrustScore * 100) : 50}%)`}
          className="w-full rounded-lg border border-zinc-200/50 bg-white/50 px-3 shadow-inner backdrop-blur py-2 text-xs text-zinc-900 dark:border-white/10 dark:bg-zinc-900/50 dark:text-zinc-100"
        />
        {kind === 'domain' ? (
          <label className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300">
            <input
              type="checkbox"
              checked={blocked}
              onChange={(event) => setBlocked(event.target.checked)}
            />
            Manually block this domain
          </label>
        ) : null}
        {kind === 'claimType' ? (
          <select
            value={forcedLane}
            onChange={(event) => setForcedLane(event.target.value as 'YELLOW' | 'RED' | '')}
            className="w-full rounded-lg border border-zinc-200/50 bg-white/50 px-3 shadow-inner backdrop-blur py-2 text-xs text-zinc-900 dark:border-white/10 dark:bg-zinc-900/50 dark:text-zinc-100"
          >
            <option value="">No forced lane</option>
            <option value="YELLOW">Force yellow</option>
            <option value="RED">Force red</option>
          </select>
        ) : null}
        <input
          type="text"
          value={overrideReason}
          onChange={(event) => setOverrideReason(event.target.value)}
          placeholder="Override reason"
          className="w-full rounded-lg border border-zinc-200/50 bg-white/50 px-3 shadow-inner backdrop-blur py-2 text-xs text-zinc-900 dark:border-white/10 dark:bg-zinc-900/50 dark:text-zinc-100"
        />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isPending}
          className="w-full rounded-lg bg-sky-500 px-3 py-2 text-xs font-semibold text-zinc-950 disabled:opacity-60"
        >
          {isPending ? 'Saving…' : 'Save override'}
        </button>
        {message ? (
          <p className="text-xs text-zinc-600 dark:text-zinc-400">{message}</p>
        ) : null}
      </div>
    </div>
  )
}

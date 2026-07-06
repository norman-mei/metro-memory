'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import ChatConsole from './ChatConsole'
import type { ClaimDTO, QueueMetricsDTO, RunDTO } from './types'

type Tab = 'queue' | 'runs' | 'chat' | 'sources'

const LANE_STYLES: Record<string, string> = {
  GREEN: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  YELLOW: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  RED: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300',
}

export default function ResearchWorkspace({
  initialClaims,
  initialRuns,
  metrics,
}: {
  initialClaims: ClaimDTO[]
  initialRuns: RunDTO[]
  metrics: QueueMetricsDTO
}) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('queue')
  const [claims, setClaims] = useState<ClaimDTO[]>(initialClaims)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [laneFilter, setLaneFilter] = useState<string>('ALL')
  const [cityFilter, setCityFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('ALL')
  const [error, setError] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const claimTypes = useMemo(
    () => Array.from(new Set(claims.map((c) => c.claimType))).sort(),
    [claims],
  )

  const visible = useMemo(() => {
    return claims.filter((c) => {
      if (laneFilter !== 'ALL' && c.lane !== laneFilter) return false
      if (typeFilter !== 'ALL' && c.claimType !== typeFilter) return false
      if (cityFilter && !c.citySlug.toLowerCase().includes(cityFilter.toLowerCase())) return false
      return true
    })
  }, [claims, laneFilter, typeFilter, cityFilter])

  const removeClaims = (ids: string[]) => {
    const idSet = new Set(ids)
    setClaims((prev) => prev.filter((c) => !idSet.has(c.id)))
    setSelected((prev) => {
      const next = new Set(prev)
      ids.forEach((id) => next.delete(id))
      return next
    })
    startTransition(() => router.refresh())
  }

  const decide = async (id: string, decision: 'approve' | 'reject' | 'apply') => {
    setError(null)
    const res = await fetch(`/api/admin/research/claims/${id}/decision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision }),
    })
    if (!res.ok) {
      const p = await res.json().catch(() => ({}))
      setError(p?.error ?? 'Decision failed.')
      return
    }
    removeClaims([id])
  }

  const bulkDecide = async (decision: 'approve' | 'reject' | 'apply') => {
    if (!selected.size) return
    setError(null)
    const ids = Array.from(selected)
    const res = await fetch('/api/admin/research/claims/bulk-decision', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids, decision }),
    })
    if (!res.ok) {
      const p = await res.json().catch(() => ({}))
      setError(p?.error ?? 'Bulk decision failed.')
      return
    }
    removeClaims(ids)
  }

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  return (
    <div className="space-y-6">
      {/* Header + metrics */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            Research console
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            AI-researched transit updates awaiting your review.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Metric label="Green" value={metrics.pending.green} tone="GREEN" />
          <Metric label="Yellow" value={metrics.pending.yellow} tone="YELLOW" />
          <Metric label="Red" value={metrics.pending.red} tone="RED" />
          <Metric label="Applied" value={metrics.totals.applied} tone="NEUTRAL" />
        </div>
      </header>

      {/* Tabs */}
      <nav className="flex gap-1 border-b border-zinc-200 dark:border-zinc-800">
        {(['queue', 'runs', 'chat', 'sources'] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium capitalize transition ${
              tab === t
                ? 'border-sky-500 text-sky-600 dark:text-sky-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            {t === 'queue' ? `Review queue (${claims.length})` : t}
          </button>
        ))}
      </nav>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
          {error}
        </div>
      ) : null}

      {tab === 'queue' && (
        <section className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={laneFilter}
              onChange={(e) => setLaneFilter(e.target.value)}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            >
              <option value="ALL">All lanes</option>
              <option value="GREEN">Green</option>
              <option value="YELLOW">Yellow</option>
              <option value="RED">Red</option>
            </select>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            >
              <option value="ALL">All claim types</option>
              {claimTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <input
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              placeholder="Filter by city…"
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
            <span className="ml-auto text-sm text-zinc-500">{visible.length} shown</span>
          </div>

          {/* Bulk bar */}
          {selected.size > 0 && (
            <div className="flex items-center gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 dark:border-sky-900/50 dark:bg-sky-950/30">
              <span className="text-sm font-medium text-sky-800 dark:text-sky-300">
                {selected.size} selected
              </span>
              <div className="ml-auto flex gap-2">
                <Btn tone="emerald" onClick={() => bulkDecide('approve')}>
                  Approve all
                </Btn>
                <Btn tone="rose" onClick={() => bulkDecide('reject')}>
                  Reject all
                </Btn>
                <Btn tone="zinc" onClick={() => setSelected(new Set())}>
                  Clear
                </Btn>
              </div>
            </div>
          )}

          {visible.length === 0 ? (
            <EmptyState />
          ) : (
            <ul className="space-y-3">
              {visible.map((claim) => (
                <ClaimRow
                  key={claim.id}
                  claim={claim}
                  selected={selected.has(claim.id)}
                  onToggle={() => toggle(claim.id)}
                  onDecide={(d) => decide(claim.id, d)}
                />
              ))}
            </ul>
          )}
        </section>
      )}

      {tab === 'runs' && <RunsTable runs={initialRuns} />}
      {tab === 'chat' && <ChatConsole />}
      {tab === 'sources' && <SourcesForm onError={setError} />}
    </div>
  )
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: 'GREEN' | 'YELLOW' | 'RED' | 'NEUTRAL'
}) {
  const styles =
    tone === 'NEUTRAL'
      ? 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200'
      : LANE_STYLES[tone]
  return (
    <div className={`rounded-xl px-4 py-2 text-center ${styles}`}>
      <div className="text-xl font-semibold leading-none">{value}</div>
      <div className="mt-1 text-xs font-medium uppercase tracking-wide opacity-80">{label}</div>
    </div>
  )
}

function ClaimRow({
  claim,
  selected,
  onToggle,
  onDecide,
}: {
  claim: ClaimDTO
  selected: boolean
  onToggle: () => void
  onDecide: (d: 'approve' | 'reject' | 'apply') => void
}) {
  const [open, setOpen] = useState(false)
  const confidencePct = claim.confidence != null ? Math.round(claim.confidence * 100) : null

  return (
    <li className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          className="mt-1.5 h-4 w-4 rounded border-zinc-300"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${LANE_STYLES[claim.lane]}`}>
              {claim.lane}
            </span>
            <span className="rounded-md bg-zinc-100 px-2 py-0.5 font-mono text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              {claim.claimType}
            </span>
            <span className="text-xs font-medium text-zinc-500">{claim.citySlug}</span>
            {confidencePct != null && (
              <span className="text-xs text-zinc-400">· {confidencePct}% confidence</span>
            )}
          </div>
          <h3 className="mt-2 font-semibold text-zinc-900 dark:text-zinc-100">{claim.title}</h3>
          {claim.summary && (
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{claim.summary}</p>
          )}
          {claim.reviewNotes && (
            <p className="mt-1 text-xs italic text-zinc-400">Policy: {claim.reviewNotes}</p>
          )}

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="mt-2 text-xs font-medium text-sky-600 hover:underline dark:text-sky-400"
          >
            {open ? 'Hide' : 'Show'} evidence ({claim.evidence.length})
          </button>
          {open && (
            <ul className="mt-2 space-y-1.5 border-l-2 border-zinc-100 pl-3 dark:border-zinc-800">
              {claim.evidence.map((e) => (
                <li key={e.id} className="text-xs">
                  <a
                    href={e.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-sky-600 hover:underline dark:text-sky-400"
                  >
                    {e.sourceTitle || e.sourceUrl}
                  </a>
                  <span className="ml-1 text-zinc-400">
                    · tier {e.tier}
                    {e.sourceDate ? ` · ${e.sourceDate.slice(0, 10)}` : ''}
                  </span>
                  {e.excerpt && <p className="mt-0.5 text-zinc-500">“{e.excerpt}”</p>}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex shrink-0 flex-col gap-2">
          <Btn tone="emerald" onClick={() => onDecide('approve')}>
            Approve
          </Btn>
          <Btn tone="rose" onClick={() => onDecide('reject')}>
            Reject
          </Btn>
          {(claim.lane === 'GREEN' || claim.status === 'APPROVED') && (
            <Btn tone="sky" onClick={() => onDecide('apply')}>
              Apply
            </Btn>
          )}
        </div>
      </div>
    </li>
  )
}

function RunsTable({ runs }: { runs: RunDTO[] }) {
  if (!runs.length) return <EmptyState message="No research runs yet." />
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800">
      <table className="w-full text-left text-sm">
        <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-900">
          <tr>
            <th className="px-4 py-3">When</th>
            <th className="px-4 py-3">Trigger</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Cities</th>
            <th className="px-4 py-3">Claims</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {runs.map((r) => (
            <tr key={r.id} className="bg-white dark:bg-zinc-950">
              <td className="px-4 py-3 text-zinc-500">{r.createdAt.slice(0, 16).replace('T', ' ')}</td>
              <td className="px-4 py-3">{r.trigger}</td>
              <td className="px-4 py-3">{r.status}</td>
              <td className="px-4 py-3 text-zinc-500">{r.citySlugs.join(', ') || '—'}</td>
              <td className="px-4 py-3">
                {typeof r.summary?.claimsCreated === 'number' ? String(r.summary.claimsCreated) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function SourcesForm({ onError }: { onError: (msg: string | null) => void }) {
  const [domain, setDomain] = useState('')
  const [tier, setTier] = useState('2')
  const [blocked, setBlocked] = useState(false)
  const [saved, setSaved] = useState(false)

  const save = async () => {
    onError(null)
    setSaved(false)
    const res = await fetch('/api/admin/research/sources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain, tier: Number(tier), blocked }),
    })
    if (!res.ok) {
      const p = await res.json().catch(() => ({}))
      onError(p?.error ?? 'Failed to save source.')
      return
    }
    setSaved(true)
    setDomain('')
  }

  return (
    <div className="max-w-lg space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-sm text-zinc-500">
        Set a domain&apos;s trust tier (1 = official, 3 = weak) or block it entirely.
      </p>
      <input
        value={domain}
        onChange={(e) => setDomain(e.target.value)}
        placeholder="e.g. mta.info"
        className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
      />
      <div className="flex items-center gap-3">
        <select
          value={tier}
          onChange={(e) => setTier(e.target.value)}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
        >
          <option value="1">Tier 1 · official</option>
          <option value="2">Tier 2 · reference</option>
          <option value="3">Tier 3 · weak</option>
        </select>
        <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
          <input type="checkbox" checked={blocked} onChange={(e) => setBlocked(e.target.checked)} />
          Block
        </label>
      </div>
      <div className="flex items-center gap-3">
        <Btn tone="sky" onClick={save}>
          Save
        </Btn>
        {saved && <span className="text-sm text-emerald-600">Saved.</span>}
      </div>
    </div>
  )
}

function EmptyState({ message = 'Nothing pending — the queue is clear.' }: { message?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-zinc-300 bg-white/50 py-16 text-center dark:border-zinc-700 dark:bg-zinc-900/40">
      <p className="text-sm text-zinc-500">{message}</p>
    </div>
  )
}

function Btn({
  children,
  onClick,
  tone,
}: {
  children: React.ReactNode
  onClick: () => void
  tone: 'emerald' | 'rose' | 'sky' | 'zinc'
}) {
  const tones: Record<string, string> = {
    emerald: 'bg-emerald-500 text-emerald-950 hover:bg-emerald-400',
    rose: 'bg-rose-500 text-rose-950 hover:bg-rose-400',
    sky: 'bg-sky-500 text-sky-950 hover:bg-sky-400',
    zinc: 'bg-zinc-200 text-zinc-800 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-100',
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${tones[tone]}`}
    >
      {children}
    </button>
  )
}

'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { RANKED_RULESETS, formatRankedRuleset } from '@/lib/ranked'

export default function BattleCreateForm({
  cities,
}: {
  cities: Array<{ slug: string; name: string }>
}) {
  const router = useRouter()
  const [citySlug, setCitySlug] = useState(cities[0]?.slug ?? '')
  const [ruleset, setRuleset] = useState<(typeof RANKED_RULESETS)[number]>('classic')
  const [status, setStatus] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    setStatus(null)
    const response = await fetch('/api/battles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ citySlug, ruleset }),
    })
    const payload = await response.json().catch(() => ({}))
    setSubmitting(false)
    if (!response.ok) {
      setStatus(payload?.error ?? 'Unable to create battle.')
      return
    }
    if (payload?.battle?.slug) {
      router.push(`/battle/${payload.battle.slug}`)
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
        City
        <select
          value={citySlug}
          onChange={(event) => setCitySlug(event.target.value)}
          className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
        >
          {cities.map((city) => (
            <option key={city.slug} value={city.slug}>
              {city.name}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Ruleset
        <select
          value={ruleset}
          onChange={(event) => setRuleset(event.target.value as (typeof RANKED_RULESETS)[number])}
          className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
        >
          {RANKED_RULESETS.map((entry) => (
            <option key={entry} value={entry}>
              {formatRankedRuleset(entry)}
            </option>
          ))}
        </select>
      </label>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex rounded-full bg-zinc-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Create invite
        </button>
        {status ? <p className="text-sm text-zinc-500 dark:text-zinc-400">{status}</p> : null}
      </div>
    </form>
  )
}

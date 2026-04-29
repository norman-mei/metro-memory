'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { buildRankedHref } from '@/lib/ranked'

type BattleSnapshot = {
  slug: string
  status: string
  cityPath: string
  ruleset: 'classic' | 'no-line-colors' | 'strict-spelling' | 'one-life'
  seed: string
  id: string
  creator: { id: string; name: string }
  opponent: { id: string; name: string } | null
  creatorSession: { userId: string } | null
  opponentSession: { userId: string } | null
}

export default function BattleActions({
  battle,
  currentUserId,
}: {
  battle: BattleSnapshot
  currentUserId: string | null
}) {
  const router = useRouter()
  const [status, setStatus] = useState<string | null>(null)
  const isCreator = currentUserId != null && battle.creator.id === currentUserId
  const isOpponent = currentUserId != null && battle.opponent?.id === currentUserId
  const hasSession =
    (isCreator && battle.creatorSession?.userId === currentUserId) ||
    (isOpponent && battle.opponentSession?.userId === currentUserId)

  const joinBattle = async () => {
    setStatus(null)
    const response = await fetch(`/api/battles/${battle.slug}/join`, {
      method: 'POST',
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) {
      setStatus(payload?.error ?? 'Unable to join battle.')
      return
    }
    router.refresh()
  }

  const requestRematch = async () => {
    setStatus(null)
    const response = await fetch(`/api/battles/${battle.slug}/rematch`, {
      method: 'POST',
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) {
      setStatus(payload?.error ?? 'Unable to create rematch.')
      return
    }
    if (payload?.battle?.slug) {
      router.push(`/battle/${payload.battle.slug}`)
    }
  }

  return (
    <div className="space-y-3">
      {currentUserId == null ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Sign in to join or play this battle.</p>
      ) : null}
      {currentUserId && !battle.opponent && !isCreator ? (
        <button
          type="button"
          onClick={joinBattle}
          className="inline-flex rounded-full bg-zinc-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Join battle
        </button>
      ) : null}
      {currentUserId && (isCreator || isOpponent) && battle.status !== 'COMPLETED' && battle.status !== 'EXPIRED' ? (
        <a
          href={buildRankedHref(battle.cityPath, {
            source: 'battle',
            ruleset: battle.ruleset,
            seed: battle.seed,
            battleId: battle.id,
          })}
          className="inline-flex rounded-full border border-zinc-300 px-5 py-3 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800"
        >
          {hasSession ? 'Resume attempt' : 'Play battle'}
        </a>
      ) : null}
      {currentUserId && (isCreator || isOpponent) && (battle.status === 'COMPLETED' || battle.status === 'EXPIRED') ? (
        <button
          type="button"
          onClick={requestRematch}
          className="inline-flex rounded-full border border-zinc-300 px-5 py-3 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800"
        >
          Create rematch
        </button>
      ) : null}
      {status ? <p className="text-sm text-zinc-500 dark:text-zinc-400">{status}</p> : null}
    </div>
  )
}

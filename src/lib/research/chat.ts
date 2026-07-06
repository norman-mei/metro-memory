// Conversational research-operations agent. Holds a multi-turn conversation,
// grounded in the live review queue, and can trigger research runs on request.

import { prisma } from '@/lib/prisma'
import { AVAILABLE_CITY_SLUGS } from '@/lib/availableCityData'

import { callResearchModelJson, type ModelMessage } from './model'
import { runResearch } from './pipeline'
import { queueMetrics } from './queue'
import { RESEARCH_CLAIM_TYPES } from './types'

const CITY_SLUGS = Array.from(AVAILABLE_CITY_SLUGS).map((c) => c.toLowerCase())
const citySet = new Set(CITY_SLUGS)

type AgentAction = { type: 'RESEARCH'; citySlugs: string[]; scope: string | null } | null

const HISTORY_LIMIT = 16
const CONTEXT_CLAIM_LIMIT = 40

/** Compact snapshot of the current queue so the agent can answer questions about it. */
async function buildQueueContext(): Promise<string> {
  const [metrics, claims] = await Promise.all([
    queueMetrics(),
    prisma.researchClaim.findMany({
      where: { status: 'PENDING' },
      orderBy: [{ lane: 'asc' }, { createdAt: 'desc' }],
      take: CONTEXT_CLAIM_LIMIT,
      include: { evidence: { select: { sourceUrl: true, tier: true } } },
    }),
  ])

  const header =
    `Queue totals — pending ${metrics.totals.pending} ` +
    `(green ${metrics.pending.green} / yellow ${metrics.pending.yellow} / red ${metrics.pending.red}), ` +
    `approved ${metrics.totals.approved}, rejected ${metrics.totals.rejected}, applied ${metrics.totals.applied}.`

  if (!claims.length) {
    return `${header}\nThere are no pending claims in the queue right now.`
  }

  const lines = claims.map((c) => {
    const conf = c.confidence != null ? `${Math.round(c.confidence * 100)}%` : 'n/a'
    const bestTier = c.evidence.length ? Math.min(...c.evidence.map((e) => e.tier)) : null
    const summary = (c.summary || '').slice(0, 120)
    return `- [${c.id.slice(0, 6)}] ${c.citySlug} | ${c.claimType} | ${c.lane} ${conf} | ${c.evidence.length} src${
      bestTier ? ` (best tier ${bestTier})` : ''
    } | ${c.title}${summary ? ` — ${summary}` : ''}`
  })

  return `${header}\nPending claims (up to ${CONTEXT_CLAIM_LIMIT}):\n${lines.join('\n')}`
}

const AGENT_INSTRUCTIONS = `You are the research operations assistant inside Metro Memory's admin console.
Metro Memory is a game where players name a city's metro stations; an AI pipeline researches
official transit sources and files "claims" (proposed data updates) into a review queue.

Your job is to help the operator understand and act on that queue, and to launch research.

You can:
- Answer questions about the current queue using the provided snapshot (claims, lanes, confidence, sources).
- Explain how things work. Lanes: GREEN = strong tier-1 evidence, safe to auto-apply; YELLOW = plausible, needs human review; RED = weak/low-confidence/conflicting, blocked. Confidence blends source quality, corroboration, and recency.
- Trigger new research runs when asked.

Guidelines:
- Be concise, friendly, and conversational. Use short paragraphs or bullet points.
- Ground every factual answer in the provided queue snapshot. If the snapshot doesn't contain the answer, say so plainly instead of inventing details.
- When the user asks to research one or more cities, set an action. Map informal names to the allowed slugs (e.g. "shenzhen" -> "gba-shenzhen"). If a requested city isn't in the allowed list, say so and set action to null.

Always return exactly one JSON object:
{"reply": "<your conversational reply to the operator>",
 "action": null | {"type":"RESEARCH","citySlugs":["<allowed-slug>"],"scope":"<short scope or null>"}}`

function heuristicFallback(message: string): { reply: string; action: AgentAction } {
  const lower = message.toLowerCase()
  const cities = CITY_SLUGS.filter((slug) => {
    const name = slug.replace(/-/g, ' ')
    return lower.includes(slug) || lower.includes(name)
  })
  const wantsResearch = /research|investigate|check|look up|update/.test(lower)
  if (wantsResearch && cities.length) {
    return {
      reply: `Starting research for ${cities.join(', ')}.`,
      action: { type: 'RESEARCH', citySlugs: cities, scope: null },
    }
  }
  return {
    reply:
      "The AI model isn't configured, so I can only run research commands right now. Try e.g. \"Research Tokyo for station openings.\"",
    action: null,
  }
}

function parseAction(raw: unknown): AgentAction {
  if (!raw || typeof raw !== 'object') return null
  const a = raw as Record<string, unknown>
  if (a.type !== 'RESEARCH') return null
  const citySlugs = Array.isArray(a.citySlugs)
    ? a.citySlugs.map((c) => String(c).toLowerCase()).filter((c) => citySet.has(c))
    : []
  if (!citySlugs.length) return null
  return { type: 'RESEARCH', citySlugs, scope: a.scope ? String(a.scope) : null }
}

/**
 * Handles one conversational turn: loads session history, grounds the model in the
 * live queue, produces a reply, optionally launches research, and persists both
 * messages. Falls back to a research-command heuristic if the model is disabled.
 */
export async function handleChatTurn(args: {
  message: string
  sessionId?: string | null
  reviewer: string
}) {
  const existing = args.sessionId
    ? await prisma.chatSession.findUnique({ where: { id: args.sessionId } })
    : null
  const session =
    existing ??
    (await prisma.chatSession.create({
      data: { title: args.message.slice(0, 80), createdBy: args.reviewer },
    }))

  // Prior turns (before recording the new user message).
  const priorDesc = await prisma.chatMessage.findMany({
    where: { sessionId: session.id },
    orderBy: { createdAt: 'desc' },
    take: HISTORY_LIMIT,
  })
  const history = priorDesc.reverse()

  await prisma.chatMessage.create({
    data: { sessionId: session.id, role: 'USER', content: args.message },
  })

  let reply: string
  let action: AgentAction

  const context = await buildQueueContext()
  const messages: ModelMessage[] = [
    {
      role: 'system',
      content: `${AGENT_INSTRUCTIONS}\n\nAllowed city slugs: ${CITY_SLUGS.join(', ')}\n\nAllowed claim types: ${RESEARCH_CLAIM_TYPES.join(
        ', ',
      )}\n\nLive review-queue snapshot:\n${context}`,
    },
    ...history.map(
      (m): ModelMessage => ({
        role: m.role === 'ASSISTANT' ? 'assistant' : 'user',
        content: m.content,
      }),
    ),
    { role: 'user', content: args.message },
  ]

  const parsed = await callResearchModelJson(messages)
  if (!parsed || typeof parsed.reply !== 'string') {
    const fb = heuristicFallback(args.message)
    reply = fb.reply
    action = fb.action
  } else {
    reply = parsed.reply.trim()
    action = parseAction(parsed.action)
  }

  let runId: string | null = null
  if (action && action.type === 'RESEARCH') {
    const summary = await runResearch({
      citySlugs: action.citySlugs,
      scope: action.scope,
      trigger: 'CHAT',
      sessionId: session.id,
      reviewer: args.reviewer,
    })
    runId = summary.runId
    reply += `\n\n✅ Ran research for ${action.citySlugs.join(', ')} — ${summary.claimsCreated} claim(s) filed (${summary.green} green, ${summary.yellow} yellow, ${summary.red} red). Check the Review Queue tab.`
  }

  await prisma.chatMessage.create({
    data: {
      sessionId: session.id,
      role: 'ASSISTANT',
      content: reply,
      structuredJson: { action, runId } as any,
    },
  })

  return { sessionId: session.id, runId, assistantContent: reply }
}

// Conversational research-operations agent. Holds a multi-turn conversation,
// grounded in the live review queue, and can trigger research runs on request.

import { prisma } from '@/lib/prisma'
import { AVAILABLE_CITY_SLUGS } from '@/lib/availableCityData'

import {
  callResearchModelJson,
  isResearchModelEnabled,
  streamResearchModel,
  type ModelMessage,
} from './model'
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

const AGENT_ROLE = `You are the research operations assistant inside Metro Memory's admin console.
Metro Memory is a game where players name a city's metro stations; an AI pipeline researches
official transit sources and files "claims" (proposed data updates) into a review queue.

Your job is to help the operator understand and act on that queue, and to launch research.

You can:
- Answer questions about the current queue using the provided snapshot (claims, lanes, confidence, sources).
- Explain how things work. Lanes: GREEN = strong tier-1 evidence, safe to auto-apply; YELLOW = plausible, needs human review; RED = weak/low-confidence/conflicting, blocked. Confidence blends source quality, corroboration, and recency.
- Trigger new research runs when the operator asks.

Guidelines:
- Be concise, friendly, and conversational. Use short paragraphs or bullet points.
- Ground every factual answer in the provided queue snapshot. If the snapshot doesn't contain the answer, say so plainly instead of inventing details.
- Map informal city names to the allowed slugs (e.g. "shenzhen" -> "gba-shenzhen"). If a requested city isn't in the allowed list, say so.`

// Output-format instruction for the non-streaming (structured JSON) path.
const JSON_OUTPUT = `Return exactly one JSON object:
{"reply": "<your conversational reply to the operator>",
 "action": null | {"type":"RESEARCH","citySlugs":["<allowed-slug>"],"scope":"<short scope or null>"}}
Set action only when the operator is asking to run research on specific cities.`

// Output-format instruction for the streaming (plain-text) path.
const STREAM_OUTPUT = `Reply in plain, conversational text — NOT JSON.
If (and only if) the operator is asking you to run or trigger research on specific cities, make the VERY FIRST line of your response exactly:
@@RESEARCH cities=slug1,slug2; scope=<short scope or none>
Then continue with a normal conversational reply on the following lines. If you are not triggering research, do NOT include that line — just reply normally.`

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
 * Reads a session's conversation, grounds the model in the live queue, produces a
 * reply, optionally launches research, and persists the assistant message. Assumes
 * the latest user message is already stored. Falls back to a heuristic if the model
 * is disabled.
 */
async function generateReply(sessionId: string, reviewer: string) {
  const stored = await prisma.chatMessage.findMany({
    where: { sessionId },
    orderBy: { createdAt: 'desc' },
    take: HISTORY_LIMIT,
  })
  const history = stored.reverse()
  const lastUser = [...history].reverse().find((m) => m.role === 'USER')

  let reply: string
  let action: AgentAction

  const context = await buildQueueContext()
  const messages: ModelMessage[] = [
    {
      role: 'system',
      content: `${AGENT_ROLE}\n\n${JSON_OUTPUT}\n\nAllowed city slugs: ${CITY_SLUGS.join(', ')}\n\nAllowed claim types: ${RESEARCH_CLAIM_TYPES.join(
        ', ',
      )}\n\nLive review-queue snapshot:\n${context}`,
    },
    ...history.map(
      (m): ModelMessage => ({
        role: m.role === 'ASSISTANT' ? 'assistant' : 'user',
        content: m.content,
      }),
    ),
  ]

  const parsed = await callResearchModelJson(messages)
  if (!parsed || typeof parsed.reply !== 'string') {
    const fb = heuristicFallback(lastUser?.content ?? '')
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
      sessionId,
      reviewer,
    })
    runId = summary.runId
    reply += `\n\n✅ Ran research for ${action.citySlugs.join(', ')} — ${summary.claimsCreated} claim(s) filed (${summary.green} green, ${summary.yellow} yellow, ${summary.red} red). Check the Review Queue tab.`
  }

  const assistant = await prisma.chatMessage.create({
    data: {
      sessionId,
      role: 'ASSISTANT',
      content: reply,
      structuredJson: { action, runId } as any,
    },
  })
  await prisma.chatSession.update({ where: { id: sessionId }, data: { updatedAt: new Date() } })

  return { sessionId, runId, assistantContent: reply, assistantId: assistant.id }
}

/**
 * Handles one conversational turn: creates/continues the session (account-scoped),
 * records the user message, and generates the assistant reply.
 */
export async function handleChatTurn(args: {
  message: string
  sessionId?: string | null
  reviewer: string
}) {
  const existing = args.sessionId
    ? await prisma.chatSession.findFirst({
        where: { id: args.sessionId, createdBy: args.reviewer },
      })
    : null
  const session =
    existing ??
    (await prisma.chatSession.create({
      data: { title: args.message.slice(0, 80), createdBy: args.reviewer },
    }))

  // Give a brand-new session a title from its first message.
  if (!existing) {
    await prisma.chatSession.update({
      where: { id: session.id },
      data: { title: args.message.slice(0, 80) || 'New chat' },
    })
  }

  await prisma.chatMessage.create({
    data: { sessionId: session.id, role: 'USER', content: args.message },
  })

  return generateReply(session.id, args.reviewer)
}

/**
 * ChatGPT-style edit: replaces a user message's content, discards everything after
 * it, and regenerates the assistant reply. Returns null if not found / not owned.
 */
export async function editAndRegenerate(args: {
  messageId: string
  content: string
  reviewer: string
}) {
  const message = await prisma.chatMessage.findUnique({
    where: { id: args.messageId },
    include: { session: { select: { createdBy: true } } },
  })
  if (!message || message.session.createdBy !== args.reviewer || message.role !== 'USER') {
    return null
  }

  await prisma.chatMessage.update({
    where: { id: message.id },
    data: { content: args.content },
  })
  await prisma.chatMessage.deleteMany({
    where: { sessionId: message.sessionId, createdAt: { gt: message.createdAt } },
  })

  return generateReply(message.sessionId, args.reviewer)
}

const RESEARCH_MARKER = '@@RESEARCH'

/**
 * Streaming variant of a chat turn. Streams the assistant's reply token-by-token
 * via `onDelta`, detecting and stripping a leading research marker so it can still
 * launch runs. Persists both messages. Falls back to a full reply if the model is
 * disabled/unreachable.
 */
export async function streamChatTurn(
  args: { message: string; sessionId?: string | null; reviewer: string },
  onDelta: (text: string) => void,
): Promise<{ sessionId: string; runId: string | null }> {
  const existing = args.sessionId
    ? await prisma.chatSession.findFirst({
        where: { id: args.sessionId, createdBy: args.reviewer },
      })
    : null
  const session =
    existing ??
    (await prisma.chatSession.create({
      data: { title: args.message.slice(0, 80) || 'New chat', createdBy: args.reviewer },
    }))

  await prisma.chatMessage.create({
    data: { sessionId: session.id, role: 'USER', content: args.message },
  })

  const stored = await prisma.chatMessage.findMany({
    where: { sessionId: session.id },
    orderBy: { createdAt: 'desc' },
    take: HISTORY_LIMIT,
  })
  const history = stored.reverse()
  const context = await buildQueueContext()

  const messages: ModelMessage[] = [
    {
      role: 'system',
      content: `${AGENT_ROLE}\n\n${STREAM_OUTPUT}\n\nAllowed city slugs: ${CITY_SLUGS.join(', ')}\n\nAllowed claim types: ${RESEARCH_CLAIM_TYPES.join(
        ', ',
      )}\n\nLive review-queue snapshot:\n${context}`,
    },
    ...history.map(
      (m): ModelMessage => ({
        role: m.role === 'ASSISTANT' ? 'assistant' : 'user',
        content: m.content,
      }),
    ),
  ]

  let visible = ''
  let action: AgentAction = null
  let checking = true
  let firstBuf = ''

  const flush = (text: string) => {
    if (text) {
      visible += text
      onDelta(text)
    }
  }

  const decideFirstLine = () => {
    checking = false
    const nl = firstBuf.indexOf('\n')
    const firstLine = (nl === -1 ? firstBuf : firstBuf.slice(0, nl)).trim()
    const rest = nl === -1 ? '' : firstBuf.slice(nl + 1)
    const m = firstLine.match(/^@@RESEARCH\s+cities=([^;\n]+)(?:;\s*scope=(.*))?$/i)
    if (m) {
      const slugs = m[1].split(',').map((s) => s.trim().toLowerCase())
      const scopeRaw = (m[2] || '').trim()
      action = parseAction({
        type: 'RESEARCH',
        citySlugs: slugs,
        scope: scopeRaw && scopeRaw.toLowerCase() !== 'none' ? scopeRaw : null,
      })
      flush(rest)
    } else {
      flush(firstBuf)
    }
    firstBuf = ''
  }

  const handle = (delta: string) => {
    if (!checking) {
      flush(delta)
      return
    }
    firstBuf += delta
    if (firstBuf.includes('\n')) {
      decideFirstLine()
      return
    }
    const trimmedStart = firstBuf.replace(/^\s+/, '')
    if (RESEARCH_MARKER.startsWith(trimmedStart) || trimmedStart.startsWith(RESEARCH_MARKER)) return
    checking = false
    flush(firstBuf)
    firstBuf = ''
  }

  const full = await streamResearchModel(messages, handle)
  if (checking) decideFirstLine()

  if (full === null && !visible) {
    const fb = isResearchModelEnabled()
      ? { reply: 'I had trouble reaching the AI just now — please try again.', action: null as AgentAction }
      : heuristicFallback(args.message)
    visible = fb.reply
    action = fb.action
    onDelta(fb.reply)
  }

  let runId: string | null = null
  if (action && action.type === 'RESEARCH') {
    flush('\n\n⏳ Running research…')
    const summary = await runResearch({
      citySlugs: action.citySlugs,
      scope: action.scope,
      trigger: 'CHAT',
      sessionId: session.id,
      reviewer: args.reviewer,
    })
    runId = summary.runId
    flush(
      `\n✅ ${action.citySlugs.join(', ')}: ${summary.claimsCreated} claim(s) filed (${summary.green} green, ${summary.yellow} yellow, ${summary.red} red). Check the Review Queue tab.`,
    )
  }

  await prisma.chatMessage.create({
    data: {
      sessionId: session.id,
      role: 'ASSISTANT',
      content: visible.trim() || '(no reply)',
      structuredJson: { action, runId } as any,
    },
  })
  await prisma.chatSession.update({ where: { id: session.id }, data: { updatedAt: new Date() } })

  return { sessionId: session.id, runId }
}

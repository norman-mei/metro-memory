// AI operator console: interpret a natural-language request into a structured
// research run, persist the conversation, and (optionally) launch the run.

import { prisma } from '@/lib/prisma'
import { AVAILABLE_CITY_SLUGS } from '@/lib/availableCityData'

import { callResearchModel } from './model'
import { runResearch } from './pipeline'
import { RESEARCH_CLAIM_TYPES } from './types'

export type InterpretedRequest = {
  intent: 'RESEARCH' | 'EXPLAIN' | 'UNKNOWN'
  citySlugs: string[]
  scope: string | null
  claimTypes: string[]
  assistantMessage: string
}

const CITY_SLUGS = Array.from(AVAILABLE_CITY_SLUGS).map((c) => c.toLowerCase())
const citySet = new Set(CITY_SLUGS)

function heuristicInterpret(message: string): InterpretedRequest {
  const lower = message.toLowerCase()
  const citySlugs = CITY_SLUGS.filter((slug) => {
    const name = slug.replace(/-/g, ' ')
    return lower.includes(slug) || lower.includes(name)
  })
  const claimTypes = RESEARCH_CLAIM_TYPES.filter((t) => lower.includes(t.replace(/_/g, ' ')))
  const intent = citySlugs.length ? 'RESEARCH' : 'UNKNOWN'
  return {
    intent,
    citySlugs,
    scope: null,
    claimTypes,
    assistantMessage: citySlugs.length
      ? `Starting research for ${citySlugs.join(', ')}.`
      : "I couldn't identify a known city in that request. Try naming a city, e.g. \"Research Tokyo for station openings.\"",
  }
}

const SYSTEM = `You convert a transit-research operator request into JSON.
Return {"intent":"RESEARCH|EXPLAIN|UNKNOWN","citySlugs":[...],"scope":string|null,
"claimTypes":[...],"assistantMessage":"one short sentence"}.
citySlugs MUST be chosen from the provided allowed list (kebab-case). claimTypes from: ${RESEARCH_CLAIM_TYPES.join(', ')}.`

export async function interpretRequest(message: string): Promise<InterpretedRequest> {
  const model = await callResearchModel(
    'chat_intent',
    SYSTEM,
    `Allowed city slugs: ${CITY_SLUGS.join(', ')}\n\nRequest: ${message}`,
  )
  if (!model) return heuristicInterpret(message)

  const citySlugs = Array.isArray(model.citySlugs)
    ? model.citySlugs.map((c: any) => String(c).toLowerCase()).filter((c: string) => citySet.has(c))
    : []
  const claimTypes = Array.isArray(model.claimTypes)
    ? model.claimTypes
        .map((t: any) => String(t))
        .filter((t: string) => (RESEARCH_CLAIM_TYPES as readonly string[]).includes(t))
    : []
  const intent =
    model.intent === 'RESEARCH' || model.intent === 'EXPLAIN' ? model.intent : citySlugs.length ? 'RESEARCH' : 'UNKNOWN'

  return {
    intent,
    citySlugs,
    scope: model.scope ? String(model.scope) : null,
    claimTypes,
    assistantMessage:
      typeof model.assistantMessage === 'string' && model.assistantMessage.trim()
        ? model.assistantMessage.trim()
        : heuristicInterpret(message).assistantMessage,
  }
}

/**
 * Handles one chat turn: creates/continues a session, records the user + assistant
 * messages, and launches a research run when the request is actionable.
 */
export async function handleChatTurn(args: {
  message: string
  sessionId?: string | null
  reviewer: string
}) {
  const session = args.sessionId
    ? await prisma.chatSession.findUnique({ where: { id: args.sessionId } })
    : null
  const activeSession =
    session ??
    (await prisma.chatSession.create({
      data: { title: args.message.slice(0, 80), createdBy: args.reviewer },
    }))

  await prisma.chatMessage.create({
    data: { sessionId: activeSession.id, role: 'USER', content: args.message },
  })

  const interpreted = await interpretRequest(args.message)

  let runId: string | null = null
  if (interpreted.intent === 'RESEARCH' && interpreted.citySlugs.length) {
    const summary = await runResearch({
      citySlugs: interpreted.citySlugs,
      scope: interpreted.scope,
      trigger: 'CHAT',
      sessionId: activeSession.id,
      reviewer: args.reviewer,
    })
    runId = summary.runId
  }

  const assistantContent =
    interpreted.intent === 'RESEARCH' && runId
      ? `${interpreted.assistantMessage} (run ${runId})`
      : interpreted.assistantMessage

  await prisma.chatMessage.create({
    data: {
      sessionId: activeSession.id,
      role: 'ASSISTANT',
      content: assistantContent,
      structuredJson: { ...interpreted, runId } as any,
    },
  })

  return { sessionId: activeSession.id, runId, interpreted, assistantContent }
}

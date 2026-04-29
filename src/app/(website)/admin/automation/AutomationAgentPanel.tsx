'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'

type AgentMessageRecord = {
  id: string
  role: 'USER' | 'ASSISTANT' | 'SYSTEM' | 'TOOL'
  status: 'PENDING' | 'STREAMING' | 'COMPLETED' | 'FAILED' | 'CANCELED'
  content: string
  branchId?: string | null
  branchRootMessageId?: string | null
  parentMessageId?: string | null
  revisionOfMessageId?: string | null
  metadataJson?: unknown
  structuredJson?: unknown
  createdAt: string
  updatedAt: string
}

type RunRequestRecord = {
  id: string
  mode: 'TARGETED_RESEARCH' | 'MANUAL_UPDATE' | 'EXPLAIN' | 'FOLLOW_UP'
  status: 'DRAFT' | 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELED'
  applyPolicy: 'REVIEW_ONLY' | 'AUTO_APPLY_GREEN_ONLY'
  branchId?: string | null
  citySlugsJson: unknown
  claimTypesJson: unknown
  createdRunId: string | null
  errorMessage: string | null
  contextJson?: unknown
  createdAt: string
  startedAt: string | null
  finishedAt: string | null
}

type OutcomeRecord = {
  id: string
  outcomeType:
    | 'EXPLAIN_ACTION'
    | 'DIRECT_ACTION'
    | 'BRANCH_PROMPT_USEFUL'
    | 'RUN_REQUEST_USEFUL'
    | 'FOLLOW_UP_IMPROVEMENT'
    | 'PLANNER_DEFAULT'
  branchId?: string | null
  summaryJson?: unknown
  createdAt: string
}

type ActionRequestRecord = {
  id: string
  actionType: string
  safety: 'SAFE' | 'CONFIRMATION_REQUIRED' | 'ADMIN_RATIONALE_REQUIRED'
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'EXECUTED' | 'CANCELED'
  branchId?: string | null
  rationale: string | null
  reviewNote: string | null
  createdAt: string
  updatedAt: string
}

type EventRecord = {
  id: string
  eventType:
    | 'MESSAGE_STREAMED'
    | 'RUN_REQUEST_QUEUED'
    | 'RESEARCH_STARTED'
    | 'CLAIM_IMPROVED'
    | 'DOMAIN_BLOCKED'
    | 'DIRECT_ACTION_REQUESTED'
    | 'DIRECT_ACTION_APPROVED'
    | 'DIRECT_ACTION_REJECTED'
    | 'DIRECT_ACTION_EXECUTED'
    | 'REPLAY_EVAL_RECORDED'
  branchId?: string | null
  createdBy: string | null
  summaryJson?: unknown
  createdAt: string
}

type SessionRecord = {
  id: string
  sessionType: 'CHAT' | 'TARGETED_RUN' | 'MANUAL_UPDATE'
  status: string
  title: string | null
  summary: string | null
  createdBy: string | null
  contextJson?: unknown
  createdAt: string
  updatedAt: string
  messages: AgentMessageRecord[]
  runRequests: RunRequestRecord[]
  outcomes: OutcomeRecord[]
  actionRequests: ActionRequestRecord[]
  events: EventRecord[]
}

type AutomationAgentPanelProps = {
  initialSessions: SessionRecord[]
  availableCitySlugs: string[]
}

const CLAIM_TYPE_OPTIONS = [
  'NEW_STATION',
  'UPDATED_STATION',
  'REMOVED_STATION',
  'NEW_LINE',
  'LINE_RENAME_CANDIDATE',
  'LINE_COLOR_CANDIDATE',
  'METADATA_CANDIDATE',
  'OPERATOR_SUGGESTION',
  'OPERATOR_METADATA_CANDIDATE',
  'IMAGE_CANDIDATE',
] as const

const MODE_OPTIONS = [
  { value: 'TARGETED_RESEARCH', label: 'Targeted research' },
  { value: 'MANUAL_UPDATE', label: 'Manual update' },
  { value: 'EXPLAIN', label: 'Explain' },
] as const

const SCOPE_OPTIONS = [
  { value: 'all', label: 'All automation lanes' },
  { value: 'lines', label: 'Lines' },
  { value: 'stations', label: 'Stations' },
  { value: 'metadata', label: 'Metadata' },
  { value: 'imagery', label: 'Imagery' },
] as const

const dateTimeFormatter = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'UTC',
})

function normalizeStringArray(value: unknown) {
  return Array.isArray(value) ? value.map((entry) => String(entry)).filter(Boolean) : []
}

function formatTimestamp(value: string | null | undefined) {
  if (!value) return 'Pending'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return dateTimeFormatter.format(date)
}

function getContextRecord(value: unknown) {
  return value && typeof value === 'object' ? (value as Record<string, any>) : {}
}

function getRunRequestStatusClasses(status: RunRequestRecord['status']) {
  if (status === 'COMPLETED') {
    return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300'
  }
  if (status === 'FAILED' || status === 'CANCELED') {
    return 'bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300'
  }
  if (status === 'RUNNING') {
    return 'bg-sky-100 text-sky-700 dark:bg-sky-950/70 dark:text-sky-300'
  }
  return 'bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300'
}

function buildStructuredPrompt(input: {
  mode: 'TARGETED_RESEARCH' | 'MANUAL_UPDATE' | 'EXPLAIN'
  citySlugs: string
  scope: string
  claimTypes: string[]
  applyPolicy: 'REVIEW_ONLY' | 'AUTO_APPLY_GREEN_ONLY'
  execute: boolean
  message: string
}) {
  return [
    `Mode: ${input.mode}`,
    `Cities: ${input.citySlugs.trim() || 'none'}`,
    `Scope: ${input.scope}`,
    `Claim types: ${input.claimTypes.join(', ') || 'all'}`,
    `Apply policy: ${input.applyPolicy}`,
    `Execute: ${input.execute ? 'true' : 'false'}`,
    input.message.trim() ? `Operator request: ${input.message.trim()}` : null,
  ]
    .filter(Boolean)
    .join('\n')
}

function parseStructuredPrompt(message: string) {
  const lines = message.split('\n')
  const read = (label: string) =>
    lines.find((line) => line.startsWith(`${label}:`))?.slice(label.length + 1).trim() || ''

  const mode = read('Mode')
  const cities = read('Cities')
  const scope = read('Scope')
  const claimTypes = read('Claim types')
  const applyPolicy = read('Apply policy')
  const execute = read('Execute')
  const operatorRequest = read('Operator request')

  return {
    mode:
      mode === 'MANUAL_UPDATE' || mode === 'EXPLAIN' ? mode : 'TARGETED_RESEARCH',
    citySlugsInput: cities === 'none' ? '' : cities,
    scope: scope || 'all',
    claimTypes:
      claimTypes && claimTypes !== 'all'
        ? claimTypes
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean)
        : [],
    applyPolicy:
      applyPolicy === 'AUTO_APPLY_GREEN_ONLY'
        ? 'AUTO_APPLY_GREEN_ONLY'
        : 'REVIEW_ONLY',
    execute: execute !== 'false',
    message: operatorRequest,
  } as const
}

function getMessageBranchId(message: AgentMessageRecord) {
  return message.branchId || 'main'
}

function getAvailableBranchIds(session: SessionRecord | null) {
  if (!session) return ['main']
  const ids = new Set<string>()
  session.messages.forEach((message) => ids.add(getMessageBranchId(message)))
  session.runRequests.forEach((request) => ids.add(request.branchId || 'main'))
  if (ids.size === 0) ids.add('main')
  return Array.from(ids)
}

function getBranchConversation(session: SessionRecord | null, branchId: string) {
  if (!session) return [] as AgentMessageRecord[]
  const messagesById = new Map(session.messages.map((message) => [message.id, message]))
  const branchMessages = session.messages.filter((message) => getMessageBranchId(message) === branchId)
  const includeIds = new Set(branchMessages.map((message) => message.id))

  for (const message of branchMessages) {
    let parentId = message.parentMessageId || null
    while (parentId) {
      includeIds.add(parentId)
      parentId = messagesById.get(parentId)?.parentMessageId || null
    }
  }

  return session.messages
    .filter((message) => includeIds.has(message.id) || (branchId === 'main' && !message.branchId))
    .sort(
      (left, right) =>
        new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
    )
}

function getSessionPreview(session: SessionRecord) {
  const latestAssistant =
    [...session.messages].reverse().find((entry) => entry.role === 'ASSISTANT') || null
  return latestAssistant?.content || session.summary || 'No assistant response yet.'
}

export default function AutomationAgentPanel({
  initialSessions,
  availableCitySlugs,
}: AutomationAgentPanelProps) {
  const [sessions, setSessions] = useState(initialSessions)
  const [activeSessionId, setActiveSessionId] = useState(initialSessions[0]?.id || '')
  const [activeBranchId, setActiveBranchId] = useState('main')
  const [mode, setMode] = useState<'TARGETED_RESEARCH' | 'MANUAL_UPDATE' | 'EXPLAIN'>(
    'TARGETED_RESEARCH',
  )
  const [citySlugsInput, setCitySlugsInput] = useState('')
  const [scope, setScope] = useState('all')
  const [claimTypes, setClaimTypes] = useState<string[]>([])
  const [applyPolicy, setApplyPolicy] = useState<'REVIEW_ONLY' | 'AUTO_APPLY_GREEN_ONLY'>(
    'REVIEW_ONLY',
  )
  const [execute, setExecute] = useState(true)
  const [message, setMessage] = useState('')
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [regeneratingMessageId, setRegeneratingMessageId] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [streamingAssistantText, setStreamingAssistantText] = useState('')
  const [liveState, setLiveState] = useState<{
    pendingResearchCount?: number
    runningResearchCount?: number
    graphAnalytics?: {
      bestPerformingBranchPrompts?: Array<{ branchId: string; prompt: string; usefulOutcomes: number }>
      repeatedlyStalledBranches?: Array<{ branchId: string; prompt: string; stalled: number }>
      reviseVsRegenerate?: {
        editSuccessRate?: number
        regenerateSuccessRate?: number
      }
    }
    recentEvents?: EventRecord[]
  } | null>(null)
  const [isPending, startTransition] = useTransition()

  const activeSession =
    sessions.find((session) => session.id === activeSessionId) || sessions[0] || null
  const availableBranchIds = useMemo(
    () => getAvailableBranchIds(activeSession),
    [activeSession],
  )
  const conversationMessages = useMemo(
    () => getBranchConversation(activeSession, activeBranchId),
    [activeBranchId, activeSession],
  )

  useEffect(() => {
    if (!availableBranchIds.includes(activeBranchId)) {
      setActiveBranchId(availableBranchIds[availableBranchIds.length - 1] || 'main')
    }
  }, [activeBranchId, availableBranchIds])

  async function refreshSessions(preferredSessionId?: string, preferredBranchId?: string) {
    const response = await fetch('/api/admin/automation/agent/sessions?limit=20', {
      method: 'GET',
      cache: 'no-store',
    })
    if (!response.ok) return
    const payload = await response.json().catch(() => null)
    if (!payload?.ok || !Array.isArray(payload.sessions)) return
    setSessions(payload.sessions)
    if (preferredSessionId) {
      setActiveSessionId(preferredSessionId)
    }
    if (preferredBranchId) {
      setActiveBranchId(preferredBranchId)
    }
  }

  useEffect(() => {
    if (!activeSessionId) return
    const source = new EventSource(`/api/admin/automation/agent/live?sessionId=${activeSessionId}`)
    source.addEventListener('snapshot', (event) => {
      try {
        const payload = JSON.parse((event as MessageEvent).data)
        if (payload?.session) {
          setSessions((current) => {
            const next = current.filter((session) => session.id !== payload.session.id)
            return [payload.session, ...next]
          })
        }
        if (payload?.liveState && typeof payload.liveState === 'object') {
          setLiveState(payload.liveState)
        }
      } catch {
        // ignore malformed live events
      }
    })
    return () => {
      source.close()
    }
  }, [activeSessionId])

  function resetComposer() {
    setMode('TARGETED_RESEARCH')
    setCitySlugsInput('')
    setScope('all')
    setClaimTypes([])
    setApplyPolicy('REVIEW_ONLY')
    setExecute(true)
    setMessage('')
    setEditingMessageId(null)
    setRegeneratingMessageId(null)
  }

  function loadComposerFromMessage(sourceMessage: string) {
    const parsed = parseStructuredPrompt(sourceMessage)
    setMode(parsed.mode)
    setCitySlugsInput(parsed.citySlugsInput)
    setScope(parsed.scope)
    setClaimTypes(parsed.claimTypes)
    setApplyPolicy(parsed.applyPolicy)
    setExecute(parsed.execute)
    setMessage(parsed.message)
  }

  function startEditingMessage(entry: AgentMessageRecord) {
    loadComposerFromMessage(entry.content)
    setEditingMessageId(entry.id)
    setRegeneratingMessageId(null)
    setStatusMessage('Editing this operator message will branch from that node.')
  }

  function startRegeneration(entry: AgentMessageRecord) {
    const sourcePrompt = conversationMessages.find((message) => message.id === entry.parentMessageId)
    if (sourcePrompt) {
      loadComposerFromMessage(sourcePrompt.content)
      setMessage(parseStructuredPrompt(sourcePrompt.content).message)
    }
    setRegeneratingMessageId(entry.id)
    setEditingMessageId(null)
    setStatusMessage('Regenerating the assistant on this node.')
  }

  async function submitPrompt() {
    setStatusMessage(null)
    setStreamingAssistantText('')

    const response = await fetch('/api/admin/automation/agent/chat/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId: activeSessionId || undefined,
        branchId: activeBranchId || undefined,
        editMessageId: editingMessageId || undefined,
        regenerateMessageId: regeneratingMessageId || undefined,
        message: buildStructuredPrompt({
          mode,
          citySlugs: citySlugsInput,
          scope,
          claimTypes,
          applyPolicy,
          execute,
          message,
        }),
      }),
    })

    if (!response.ok || !response.body) {
      setStatusMessage('Agent request failed.')
      return
    }

    const decoder = new TextDecoder()
    const reader = response.body.getReader()
    let buffer = ''
    let nextSessionId = activeSessionId
    let nextBranchId = activeBranchId
    let doneMessage = ''

    const flushEvent = (rawEvent: string) => {
      const lines = rawEvent.split('\n').filter(Boolean)
      const eventName = lines.find((line) => line.startsWith('event:'))?.slice(6).trim() || 'message'
      const dataLine = lines.find((line) => line.startsWith('data:'))?.slice(5).trim() || '{}'
      const payload = JSON.parse(dataLine)
      if (eventName === 'status') {
        setStatusMessage(payload.state === 'thinking' ? 'Agent is thinking…' : null)
      }
      if (eventName === 'meta') {
        if (typeof payload.sessionId === 'string') nextSessionId = payload.sessionId
        if (typeof payload.branchId === 'string') nextBranchId = payload.branchId
      }
      if (eventName === 'assistant_delta') {
        setStreamingAssistantText((current) => current + String(payload.text || ''))
      }
      if (eventName === 'done') {
        doneMessage = String(payload.assistantMessage || '')
      }
      if (eventName === 'error') {
        setStatusMessage(String(payload.error || 'Agent request failed.'))
      }
    }

    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const events = buffer.split('\n\n')
      buffer = events.pop() || ''
      events.forEach((event) => {
        if (event.trim()) flushEvent(event)
      })
    }

    await refreshSessions(nextSessionId, nextBranchId)
    setActiveSessionId(nextSessionId || '')
    setActiveBranchId(nextBranchId || 'main')
    setStatusMessage(doneMessage || 'Saved')
    setStreamingAssistantText('')
    setEditingMessageId(null)
    setRegeneratingMessageId(null)
    if (mode !== 'EXPLAIN') {
      setMessage('')
    }
  }

  function queueSavedRequest(requestId: string, sessionId: string) {
    startTransition(async () => {
      setStatusMessage(null)
      const response = await fetch(`/api/admin/automation/run-requests/${requestId}`, {
        method: 'POST',
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        setStatusMessage(payload?.error || 'Failed to queue saved request.')
        return
      }
      await refreshSessions(sessionId, activeBranchId)
      setStatusMessage(`Queued run request ${requestId}.`)
    })
  }

  const branchRunRequests = (activeSession?.runRequests || []).filter(
    (request) => (request.branchId || 'main') === activeBranchId,
  )
  const branchOutcomes = (activeSession?.outcomes || []).filter(
    (outcome) => (outcome.branchId || 'main') === activeBranchId,
  )
  const branchActionRequests = (activeSession?.actionRequests || []).filter(
    (request) => (request.branchId || 'main') === activeBranchId,
  )
  const branchEvents = ((liveState?.recentEvents || activeSession?.events || []) as EventRecord[]).filter(
    (event) => (event.branchId || 'main') === activeBranchId,
  )

  return (
    <section className="mb-8 overflow-hidden rounded-[2rem] border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div className="border-b border-zinc-200 bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.12),_transparent_35%),linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(244,244,245,0.92))] px-5 py-5 dark:border-zinc-800 dark:bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.15),_transparent_35%),linear-gradient(180deg,_rgba(24,24,27,0.98),_rgba(9,9,11,0.95))]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-600 dark:text-sky-300">
              Operator agent
            </p>
            <h2 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
              Autonomous research chat
            </h2>
            <p className="max-w-3xl text-sm leading-6 text-zinc-600 dark:text-zinc-300">
              Branch at any message, regenerate assistant replies on the same node, and watch run
              and follow-up status update live.
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-200/80 bg-white/80 px-4 py-3 text-sm text-zinc-600 backdrop-blur dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-300">
            <div className="font-semibold text-zinc-950 dark:text-zinc-50">
              {availableCitySlugs.length} available city slugs
            </div>
            <div className="mt-1 max-w-md text-xs leading-5">
              Examples: {availableCitySlugs.slice(0, 10).join(', ')}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-0 xl:grid-cols-[300px,minmax(0,1fr),360px]">
        <aside className="border-b border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/60 xl:border-b-0 xl:border-r">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">Chats</h3>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Conversation roots with message-graph branches inside each chat.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setActiveSessionId('')
                setActiveBranchId('main')
                resetComposer()
              }}
              className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-800 transition hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            >
              New chat
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {sessions.map((session, index) => (
              <button
                key={session.id}
                type="button"
                onClick={() => {
                  setActiveSessionId(session.id)
                  setActiveBranchId(getAvailableBranchIds(session).slice(-1)[0] || 'main')
                  setEditingMessageId(null)
                  setRegeneratingMessageId(null)
                }}
                className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                  session.id === activeSession?.id
                    ? 'border-sky-400 bg-white shadow-sm dark:border-sky-700 dark:bg-zinc-950'
                    : 'border-zinc-200 bg-white/80 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950/70'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                      {session.title || `Operator session ${index + 1}`}
                    </div>
                    <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                      {formatTimestamp(session.updatedAt)}
                    </div>
                  </div>
                  <span className="rounded-full bg-zinc-900 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white dark:bg-zinc-100 dark:text-zinc-900">
                    {getAvailableBranchIds(session).length} branches
                  </span>
                </div>
                <p className="mt-3 line-clamp-3 text-sm leading-5 text-zinc-600 dark:text-zinc-300">
                  {getSessionPreview(session)}
                </p>
              </button>
            ))}
          </div>
        </aside>

        <div className="flex min-h-[780px] flex-col border-b border-zinc-200 bg-zinc-50/50 dark:border-zinc-800 dark:bg-zinc-950/60 xl:border-b-0">
          <div className="border-b border-zinc-200 bg-white/90 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950/80">
            <div className="flex flex-wrap items-center gap-2">
              {availableBranchIds.map((branchId, index) => (
                <button
                  key={branchId}
                  type="button"
                  onClick={() => setActiveBranchId(branchId)}
                  className={`rounded-full px-3 py-2 text-xs font-semibold transition ${
                    branchId === activeBranchId
                      ? 'bg-gradient-to-r from-sky-400 to-indigo-500 text-white shadow-md transition hover:shadow-lg'
                      : 'border border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200'
                  }`}
                >
                  {index === 0 && branchId === 'main' ? 'Main' : branchId.slice(0, 12)}
                </button>
              ))}
            </div>
            {activeSession ? (
              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                <span>{activeSession.title || 'Untitled operator session'}</span>
                <span>Updated {formatTimestamp(activeSession.updatedAt)}</span>
                <span>Branch {activeBranchId === 'main' ? 'main' : activeBranchId.slice(0, 12)}</span>
                {liveState ? (
                  <span>
                    Research queue {liveState.pendingResearchCount || 0} pending / {liveState.runningResearchCount || 0} running
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-5">
            {!activeSession || conversationMessages.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-zinc-300 bg-white/80 p-8 text-center text-sm text-zinc-500 dark:border-white/10 dark:bg-zinc-900/50/70 dark:text-zinc-400">
                Start a conversation on the right. Message edits create branch nodes instead of
                cloning the whole session.
              </div>
            ) : null}

            {conversationMessages.map((entry) => {
              const isUser = entry.role === 'USER'
              return (
                <div key={entry.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-3xl rounded-[1.75rem] px-4 py-4 shadow-sm ${
                      isUser
                        ? 'bg-zinc-950 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900'
                        : 'border border-zinc-200 bg-white text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4 text-[11px] font-semibold uppercase tracking-[0.16em]">
                      <span>
                        {isUser ? 'Operator' : entry.role === 'SYSTEM' ? 'System' : entry.role === 'TOOL' ? 'Tool' : 'Agent'}
                      </span>
                      <div className="flex items-center gap-3">
                        {entry.status !== 'COMPLETED' ? (
                          <span>{entry.status.toLowerCase()}</span>
                        ) : null}
                        <span>{formatTimestamp(entry.createdAt)}</span>
                        {isUser ? (
                          <button
                            type="button"
                            onClick={() => startEditingMessage(entry)}
                            className="rounded-full border border-white/20 px-2 py-1 text-[10px] font-semibold transition hover:border-white/40 dark:border-zinc-500 dark:hover:border-zinc-400"
                          >
                            Branch edit
                          </button>
                        ) : entry.role === 'ASSISTANT' ? (
                          <button
                            type="button"
                            onClick={() => startRegeneration(entry)}
                            className="rounded-full border border-zinc-300 px-2 py-1 text-[10px] font-semibold transition hover:border-zinc-400 dark:border-zinc-600 dark:hover:border-zinc-500"
                          >
                            Regenerate
                          </button>
                        ) : null}
                      </div>
                    </div>
                    {entry.revisionOfMessageId ? (
                      <div className="mt-2 text-[11px] uppercase tracking-[0.16em] text-zinc-400">
                        revision of {entry.revisionOfMessageId.slice(0, 8)}
                      </div>
                    ) : null}
                    <p className="mt-3 whitespace-pre-line text-sm leading-7">{entry.content}</p>
                  </div>
                </div>
              )
            })}

            {streamingAssistantText ? (
              <div className="flex justify-start">
                <div className="max-w-3xl rounded-[1.75rem] border border-zinc-200 bg-white px-4 py-4 text-zinc-800 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
                  <div className="flex items-center justify-between gap-4 text-[11px] font-semibold uppercase tracking-[0.16em]">
                    <span>Agent</span>
                    <span>streaming</span>
                  </div>
                  <p className="mt-3 whitespace-pre-line text-sm leading-7">{streamingAssistantText}</p>
                </div>
              </div>
            ) : null}
          </div>

          <div className="border-t border-zinc-200 bg-white/95 p-4 dark:border-zinc-800 dark:bg-zinc-950/90">
            <div className="rounded-[1.75rem] border border-white/40 bg-white/70 p-4 shadow-lg backdrop-blur-xl dark:border-white/10 dark:bg-zinc-900/50">
              <div className="flex flex-wrap items-center gap-2">
                {MODE_OPTIONS.map((option) => {
                  const active = mode === option.value
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() =>
                        setMode(option.value as 'TARGETED_RESEARCH' | 'MANUAL_UPDATE' | 'EXPLAIN')
                      }
                      className={`rounded-full px-3 py-2 text-xs font-semibold transition ${
                        active
                          ? 'bg-gradient-to-r from-sky-400 to-indigo-500 text-white shadow-md transition hover:shadow-lg'
                          : 'border border-zinc-200 bg-zinc-50 text-zinc-700 hover:border-zinc-300 dark:border-white/10 dark:bg-zinc-900/50 dark:text-zinc-200'
                      }`}
                    >
                      {option.label}
                    </button>
                  )
                })}
                <label className="ml-auto flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-300">
                  <input
                    type="checkbox"
                    checked={execute}
                    onChange={(event) => setExecute(event.target.checked)}
                    disabled={mode === 'EXPLAIN'}
                    className="h-4 w-4 rounded border-zinc-300 text-sky-500 focus:ring-sky-500"
                  />
                  Queue immediately
                </label>
              </div>

              {editingMessageId || regeneratingMessageId ? (
                <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
                  {editingMessageId
                    ? 'Submitting will create a new branch from the edited user prompt.'
                    : 'Submitting will regenerate the assistant reply on the current node.'}
                </div>
              ) : null}

              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <label className="space-y-2 text-sm">
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">Cities</span>
                  <input
                    value={citySlugsInput}
                    onChange={(event) => setCitySlugsInput(event.target.value)}
                    placeholder="dc, ny, chicago"
                    className="w-full rounded-2xl border border-zinc-200/50 bg-white/50 px-3 shadow-inner backdrop-blur py-2.5 text-sm text-zinc-900 outline-none transition focus:border-sky-400 dark:border-white/10 dark:bg-zinc-900/50 dark:text-zinc-100"
                  />
                </label>

                <label className="space-y-2 text-sm">
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">Scope</span>
                  <select
                    value={scope}
                    onChange={(event) => setScope(event.target.value)}
                    className="w-full rounded-2xl border border-zinc-200/50 bg-white/50 px-3 shadow-inner backdrop-blur py-2.5 text-sm text-zinc-900 outline-none transition focus:border-sky-400 dark:border-white/10 dark:bg-zinc-900/50 dark:text-zinc-100"
                  >
                    {SCOPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2 text-sm">
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">Apply policy</span>
                  <select
                    value={applyPolicy}
                    onChange={(event) =>
                      setApplyPolicy(event.target.value as 'REVIEW_ONLY' | 'AUTO_APPLY_GREEN_ONLY')
                    }
                    disabled={mode === 'EXPLAIN'}
                    className="w-full rounded-2xl border border-zinc-200/50 bg-white/50 px-3 shadow-inner backdrop-blur py-2.5 text-sm text-zinc-900 outline-none transition focus:border-sky-400 disabled:opacity-60 dark:border-white/10 dark:bg-zinc-900/50 dark:text-zinc-100"
                  >
                    <option value="REVIEW_ONLY">Review only</option>
                    <option value="AUTO_APPLY_GREEN_ONLY">Auto-apply green only</option>
                  </select>
                </label>

                <label className="space-y-2 text-sm">
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">Claim types</span>
                  <select
                    value={claimTypes[0] || ''}
                    onChange={(event) => setClaimTypes(event.target.value ? [event.target.value] : [])}
                    className="w-full rounded-2xl border border-zinc-200/50 bg-white/50 px-3 shadow-inner backdrop-blur py-2.5 text-sm text-zinc-900 outline-none transition focus:border-sky-400 dark:border-white/10 dark:bg-zinc-900/50 dark:text-zinc-100"
                  >
                    <option value="">All claim types</option>
                    {CLAIM_TYPE_OPTIONS.map((claimType) => (
                      <option key={claimType} value={claimType}>
                        {claimType}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="mt-4 block space-y-2 text-sm">
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">Message</span>
                <textarea
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  rows={5}
                  placeholder="Explain why dc is blocked. Block domain example.com. Rerun follow-up for claim abc123. Queue follow-up for chicago station changes."
                  className="w-full rounded-[1.5rem] border border-zinc-200/50 bg-white/50 px-4 py-3 shadow-inner backdrop-blur text-sm text-zinc-900 outline-none transition focus:border-sky-400 dark:border-white/10 dark:bg-zinc-900/50 dark:text-zinc-100"
                />
              </label>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-zinc-500 dark:text-zinc-400">
                  {mode === 'EXPLAIN'
                    ? 'Explain mode analyzes current state without queueing a sync run.'
                    : 'Direct actions, follow-up queueing, and run requests all flow through this branch-aware chat.'}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={resetComposer}
                    className="rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 transition hover:border-zinc-400 dark:border-white/10 dark:bg-zinc-900/50 dark:text-zinc-100"
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    onClick={() => startTransition(() => void submitPrompt())}
                    disabled={isPending}
                    className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-sky-400 disabled:opacity-60"
                  >
                    {editingMessageId
                      ? 'Create branch reply'
                      : regeneratingMessageId
                        ? 'Regenerate reply'
                        : 'Send'}
                  </button>
                </div>
              </div>

              {statusMessage ? (
                <p className="mt-3 whitespace-pre-line text-sm text-zinc-600 dark:text-zinc-300">
                  {statusMessage}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <aside className="bg-white/90 p-4 dark:bg-zinc-950/80 xl:border-l xl:border-zinc-200 xl:dark:border-zinc-800">
          <div className="space-y-4">
            <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
              <h3 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">Branch details</h3>
              <div className="mt-3 space-y-2 text-sm text-zinc-600 dark:text-zinc-300">
                <p>Branch id: {activeBranchId}</p>
                <p>Messages in branch path: {conversationMessages.length}</p>
                <p>Run requests in branch: {branchRunRequests.length}</p>
                <p>Action requests in branch: {branchActionRequests.length}</p>
                <p>Outcomes in branch: {branchOutcomes.length}</p>
                {liveState ? (
                  <p>
                    Live follow-up: {liveState.pendingResearchCount || 0} pending, {liveState.runningResearchCount || 0} running
                  </p>
                ) : null}
              </div>
            </div>

            <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
              <h3 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">Requests in this branch</h3>
              <div className="mt-4 space-y-3">
                {branchRunRequests.length === 0 ? (
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">No run requests in this branch yet.</p>
                ) : null}
                {branchRunRequests.map((request) => {
                  const cities = normalizeStringArray(request.citySlugsJson)
                  const claimTypeValues = normalizeStringArray(request.claimTypesJson)
                  const context = getContextRecord(request.contextJson)
                  const executor = getContextRecord(context.executor)
                  const telemetry = getContextRecord(context.telemetry)
                  return (
                    <div
                      key={request.id}
                      className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-white/10 dark:bg-zinc-900/50"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                            {request.mode.replaceAll('_', ' ')}
                          </div>
                          <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                            {formatTimestamp(request.createdAt)}
                          </div>
                        </div>
                        <span
                          className={`rounded-full px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${getRunRequestStatusClasses(request.status)}`}
                        >
                          {request.status}
                        </span>
                      </div>
                      <div className="mt-3 space-y-2 text-sm text-zinc-600 dark:text-zinc-300">
                        <p>Cities: {cities.join(', ') || 'None'}</p>
                        <p>Claim types: {claimTypeValues.join(', ') || 'All'}</p>
                        <p>Apply: {request.applyPolicy}</p>
                        {executor.mode ? <p>Executor: {String(executor.mode)}</p> : null}
                        {request.createdRunId ? <p>Automation run: {request.createdRunId}</p> : null}
                        {typeof telemetry.durationMs === 'number' ? <p>Duration: {telemetry.durationMs} ms</p> : null}
                        {request.errorMessage ? <p className="text-rose-600 dark:text-rose-300">{request.errorMessage}</p> : null}
                      </div>
                      {request.status === 'DRAFT' || request.status === 'FAILED' ? (
                        <div className="mt-3">
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => {
                              if (!activeSession) return
                              queueSavedRequest(request.id, activeSession.id)
                            }}
                            className="rounded-xl bg-sky-500 px-3 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-sky-400 disabled:opacity-60"
                          >
                            Queue now
                          </button>
                        </div>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
              <h3 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">Action approvals</h3>
              <div className="mt-4 space-y-3">
                {branchActionRequests.length === 0 ? (
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">No direct-action approvals recorded for this branch.</p>
                ) : null}
                {branchActionRequests.map((request) => (
                  <div
                    key={request.id}
                    className="rounded-2xl border border-zinc-200 bg-white p-3 text-sm dark:border-white/10 dark:bg-zinc-900/50"
                  >
                    <div className="font-semibold text-zinc-950 dark:text-zinc-50">
                      {request.actionType.toLowerCase().replaceAll('_', ' ')}
                    </div>
                    <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                      {request.status.toLowerCase().replaceAll('_', ' ')} · {request.safety.toLowerCase().replaceAll('_', ' ')}
                    </div>
                    {request.rationale ? (
                      <p className="mt-2 text-xs leading-5 text-zinc-600 dark:text-zinc-300">
                        Rationale: {request.rationale}
                      </p>
                    ) : null}
                    {request.reviewNote ? (
                      <p className="mt-1 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
                        Note: {request.reviewNote}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
              <h3 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">Event history</h3>
              <div className="mt-4 space-y-3">
                {branchEvents.length === 0 ? (
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">No durable events recorded for this branch yet.</p>
                ) : null}
                {branchEvents.slice(0, 10).map((event) => (
                  <div
                    key={event.id}
                    className="rounded-2xl border border-zinc-200 bg-white p-3 text-sm dark:border-white/10 dark:bg-zinc-900/50"
                  >
                    <div className="font-semibold text-zinc-950 dark:text-zinc-50">
                      {event.eventType.toLowerCase().replaceAll('_', ' ')}
                    </div>
                    <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                      {formatTimestamp(event.createdAt)}
                    </div>
                    <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-xs leading-5 text-zinc-600 dark:text-zinc-300">
                      {JSON.stringify(event.summaryJson || {}, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
              <h3 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">Graph analytics</h3>
              <div className="mt-4 space-y-3 text-sm text-zinc-600 dark:text-zinc-300">
                <p>
                  Edit success rate:{' '}
                  {typeof liveState?.graphAnalytics?.reviseVsRegenerate?.editSuccessRate === 'number'
                    ? `${Math.round(liveState.graphAnalytics.reviseVsRegenerate.editSuccessRate * 100)}%`
                    : 'n/a'}
                </p>
                <p>
                  Regenerate success rate:{' '}
                  {typeof liveState?.graphAnalytics?.reviseVsRegenerate?.regenerateSuccessRate === 'number'
                    ? `${Math.round(liveState.graphAnalytics.reviseVsRegenerate.regenerateSuccessRate * 100)}%`
                    : 'n/a'}
                </p>
                <div>
                  <div className="font-semibold text-zinc-950 dark:text-zinc-50">Best prompts</div>
                  <div className="mt-2 space-y-2">
                    {(liveState?.graphAnalytics?.bestPerformingBranchPrompts || []).slice(0, 3).map((entry) => (
                      <div key={`${entry.branchId}:${entry.prompt}`} className="rounded-2xl border border-zinc-200 bg-white p-3 text-xs dark:border-white/10 dark:bg-zinc-900/50">
                        <div className="font-semibold">{entry.branchId}</div>
                        <div className="mt-1 line-clamp-3">{entry.prompt}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="font-semibold text-zinc-950 dark:text-zinc-50">Stalled branches</div>
                  <div className="mt-2 space-y-2">
                    {(liveState?.graphAnalytics?.repeatedlyStalledBranches || []).slice(0, 3).map((entry) => (
                      <div key={`${entry.branchId}:${entry.prompt}`} className="rounded-2xl border border-zinc-200 bg-white p-3 text-xs dark:border-white/10 dark:bg-zinc-900/50">
                        <div className="font-semibold">{entry.branchId}</div>
                        <div className="mt-1 line-clamp-3">{entry.prompt}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
              <h3 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">Learning signals</h3>
              <div className="mt-4 space-y-3">
                {branchOutcomes.length === 0 ? (
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">No recorded outcomes for this branch yet.</p>
                ) : null}
                {branchOutcomes.map((outcome) => (
                  <div
                    key={outcome.id}
                    className="rounded-2xl border border-zinc-200 bg-white p-3 text-sm dark:border-white/10 dark:bg-zinc-900/50"
                  >
                    <div className="font-semibold text-zinc-950 dark:text-zinc-50">
                      {outcome.outcomeType.toLowerCase().replaceAll('_', ' ')}
                    </div>
                    <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                      {formatTimestamp(outcome.createdAt)}
                    </div>
                    <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-xs leading-5 text-zinc-600 dark:text-zinc-300">
                      {JSON.stringify(outcome.summaryJson || {}, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </section>
  )
}

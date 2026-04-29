type JsonRecord = Record<string, any>

type ClaimResearchTaskInput = {
  id?: string | null
  taskType: string
  status: string
  priority?: number | null
  retryCount?: number | null
  blockedReason?: string | null
  nextActionHint?: string | null
  nextAttemptAt?: Date | string | null
  goalJson?: unknown
  resultJson?: unknown
}

type ClaimResearchRunInput = {
  id?: string | null
  status?: string | null
  attemptNumber?: number | null
}

export type AutomationClaimResearchState = {
  status: 'PENDING' | 'SATISFIED' | 'BLOCKED' | 'EXHAUSTED'
  statusReason: string
  stopReasons: string[]
  lane: string | null
  autoApplyEligible: boolean
  latestResearchRunId: string | null
  runCount: number
  runAttemptCount: number
  maxResearchRunAttempts: number
  totalTaskCount: number
  pendingTaskCount: number
  satisfiedTaskCount: number
  blockedTaskCount: number
  exhaustedTaskCount: number
  nextTask:
    | {
        taskId: string | null
        taskType: string
        title: string
        retryCount: number
        nextAttemptAt: string | null
        nextActionHint: string | null
      }
    | null
  openTaskTypes: string[]
  evidence: {
    overallScore: number | null
    supportScore: number
    contradictionScore: number
    contradictionFlag: boolean
    blockedBySourcePolicy: boolean
    officialEvidenceCount: number
    gtfsEvidenceCount: number
    missingEvidence: string[]
    nextBestAction: string | null
    recommendedTaskTypes: string[]
    plannerReason: string | null
    evidenceGraphSummary: JsonRecord | null
  }
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as JsonRecord) : {}
}

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.map((entry) => String(entry)).filter(Boolean) : []
}

function asNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function normalizeTaskTitle(task: ClaimResearchTaskInput) {
  const goalJson = asRecord(task.goalJson)
  if (typeof goalJson.title === 'string' && goalJson.title.trim()) {
    return goalJson.title.trim()
  }
  return task.taskType.toLowerCase().replaceAll('_', ' ')
}

function normalizeDate(value: Date | string | null | undefined) {
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'string' && value.trim()) return value
  return null
}

function sortTaskInputs(tasks: ClaimResearchTaskInput[]) {
  return [...tasks].sort((left, right) => {
    const leftPriority = typeof left.priority === 'number' ? left.priority : Number.MAX_SAFE_INTEGER
    const rightPriority = typeof right.priority === 'number' ? right.priority : Number.MAX_SAFE_INTEGER
    if (leftPriority !== rightPriority) return leftPriority - rightPriority
    const leftTime = normalizeDate(left.nextAttemptAt)
    const rightTime = normalizeDate(right.nextAttemptAt)
    if (leftTime && rightTime) return leftTime.localeCompare(rightTime)
    if (leftTime) return -1
    if (rightTime) return 1
    return String(left.id || '').localeCompare(String(right.id || ''))
  })
}

export function buildAutomationClaimResearchState(input: {
  lane?: string | null
  autoApplyEligible?: boolean
  verificationJson?: unknown
  tasks?: ClaimResearchTaskInput[]
  researchRuns?: ClaimResearchRunInput[]
  latestResearchRunId?: string | null
  maxResearchRunAttempts?: number
}): AutomationClaimResearchState {
  const verificationJson = asRecord(input.verificationJson)
  const tasks = sortTaskInputs(input.tasks || [])
  const researchRuns = input.researchRuns || []
  const pendingTasks = tasks.filter((task) => task.status === 'PENDING' || task.status === 'RUNNING')
  const satisfiedTasks = tasks.filter((task) => task.status === 'SATISFIED')
  const blockedTasks = tasks.filter((task) => task.status === 'BLOCKED')
  const exhaustedTasks = tasks.filter((task) => task.status === 'EXHAUSTED')
  const contradictionFlag = Boolean(
    verificationJson.contradictionFlag || verificationJson.hasConflict,
  )
  const contradictionScore = Math.max(0, Math.min(1, asNumber(verificationJson.contradictionScore) || 0))
  const officialEvidenceCount = Math.max(
    0,
    Math.trunc(asNumber(verificationJson.officialEvidenceCount) || 0),
  )
  const gtfsEvidenceCount = Math.max(
    0,
    Math.trunc(asNumber(verificationJson.gtfsEvidenceCount) || 0),
  )
  const followUpRecommended = Boolean(verificationJson.followUpRecommended)
  const blockedBySourcePolicy = Boolean(verificationJson.blockedBySourcePolicy)
  const runAttemptCount = researchRuns.reduce(
    (max, run) => Math.max(max, typeof run.attemptNumber === 'number' ? run.attemptNumber : 0),
    0,
  )
  const maxResearchRunAttempts =
    typeof input.maxResearchRunAttempts === 'number' && input.maxResearchRunAttempts > 0
      ? Math.trunc(input.maxResearchRunAttempts)
      : 4
  const attemptCapReached = runAttemptCount >= maxResearchRunAttempts
  const nextTask = pendingTasks[0]
    ? {
        taskId: pendingTasks[0].id || null,
        taskType: pendingTasks[0].taskType,
        title: normalizeTaskTitle(pendingTasks[0]),
        retryCount:
          typeof pendingTasks[0].retryCount === 'number' ? pendingTasks[0].retryCount : 0,
        nextAttemptAt: normalizeDate(pendingTasks[0].nextAttemptAt),
        nextActionHint: pendingTasks[0].nextActionHint || null,
      }
    : null
  const stopReasons: string[] = []
  let status: AutomationClaimResearchState['status'] = 'PENDING'
  let statusReason = 'Follow-up work remains active for this claim.'

  if (blockedBySourcePolicy) {
    status = 'BLOCKED'
    statusReason = 'Follow-up stopped because the available evidence is blocked by source policy.'
    stopReasons.push('blocked_source_policy')
  } else if (contradictionFlag && contradictionScore >= 0.72) {
    status = 'BLOCKED'
    statusReason = 'Follow-up stopped because contradiction severity crossed the bounded threshold.'
    stopReasons.push('contradiction_threshold_reached')
  } else if (tasks.length === 0 && !followUpRecommended) {
    status = 'SATISFIED'
    statusReason = 'No follow-up work is currently required for this claim.'
    stopReasons.push('no_follow_up_required')
  } else if (pendingTasks.length > 0) {
    status = 'PENDING'
    statusReason = 'Bounded follow-up tasks remain pending for this claim.'
  } else if (tasks.length > 0 && satisfiedTasks.length === tasks.length && !followUpRecommended) {
    status = 'SATISFIED'
    statusReason = 'All bounded follow-up tasks were satisfied.'
    stopReasons.push('all_tasks_satisfied')
  } else if (
    officialEvidenceCount + gtfsEvidenceCount < 1 &&
    pendingTasks.length === 0 &&
    (exhaustedTasks.length > 0 || blockedTasks.length > 0 || attemptCapReached)
  ) {
    status = 'EXHAUSTED'
    statusReason =
      'Follow-up stopped because no qualifying official evidence was found within the bounded search budget.'
    stopReasons.push('insufficient_official_evidence')
  } else if (tasks.length > 0 && blockedTasks.length === tasks.length) {
    status = 'BLOCKED'
    statusReason = 'All bounded follow-up tasks were blocked.'
    stopReasons.push('all_tasks_blocked')
  } else if (attemptCapReached && pendingTasks.length === 0) {
    status = 'EXHAUSTED'
    statusReason = 'Follow-up stopped because the claim-level research attempt cap was reached.'
    stopReasons.push('claim_attempt_cap_reached')
  } else if (exhaustedTasks.length > 0 && pendingTasks.length === 0 && !followUpRecommended) {
    status = 'EXHAUSTED'
    statusReason = 'Follow-up tasks exhausted their bounded retries.'
    stopReasons.push('task_retry_budget_exhausted')
  } else if (followUpRecommended) {
    status = 'PENDING'
    statusReason = 'Verification still recommends additional bounded follow-up research.'
  } else {
    status = 'BLOCKED'
    statusReason = 'No viable next bounded task remains for this claim.'
    stopReasons.push('no_viable_next_task')
  }

  return {
    status,
    statusReason,
    stopReasons,
    lane: input.lane || null,
    autoApplyEligible: Boolean(input.autoApplyEligible),
    latestResearchRunId: input.latestResearchRunId || researchRuns[0]?.id || null,
    runCount: researchRuns.length,
    runAttemptCount,
    maxResearchRunAttempts,
    totalTaskCount: tasks.length,
    pendingTaskCount: pendingTasks.length,
    satisfiedTaskCount: satisfiedTasks.length,
    blockedTaskCount: blockedTasks.length,
    exhaustedTaskCount: exhaustedTasks.length,
    nextTask,
    openTaskTypes: Array.from(
      new Set(
        pendingTasks.length > 0
          ? pendingTasks.map((task) => task.taskType)
          : asStringArray(verificationJson.recommendedTaskTypes),
      ),
    ),
    evidence: {
      overallScore: asNumber(verificationJson.overallScore),
      supportScore: Math.max(0, Math.min(1, asNumber(verificationJson.supportScore) || 0)),
      contradictionScore,
      contradictionFlag,
      blockedBySourcePolicy,
      officialEvidenceCount,
      gtfsEvidenceCount,
      missingEvidence: asStringArray(verificationJson.missingEvidence),
      nextBestAction:
        typeof verificationJson.nextBestAction === 'string'
          ? verificationJson.nextBestAction
          : null,
      recommendedTaskTypes: asStringArray(verificationJson.recommendedTaskTypes),
      plannerReason:
        typeof verificationJson.groundedPlannerReason === 'string'
          ? verificationJson.groundedPlannerReason
          : typeof verificationJson.plannerReason === 'string'
            ? verificationJson.plannerReason
            : null,
      evidenceGraphSummary:
        verificationJson.evidenceGraphSummary &&
        typeof verificationJson.evidenceGraphSummary === 'object' &&
        !Array.isArray(verificationJson.evidenceGraphSummary)
          ? (verificationJson.evidenceGraphSummary as JsonRecord)
          : null,
    },
  }
}

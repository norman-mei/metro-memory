type AutomationApplyWorkflowSummary = {
  mode?: string
  status?: string
  repo?: string
  workflowFile?: string
  ref?: string
  reviewer?: string
  dispatchedAt?: string
  completedAt?: string
  conclusion?: string | null
  actionsUrl?: string
  runUrl?: string
  runNumber?: number | null
  branchName?: string
  pullRequestUrl?: string
}

export type AutomationApplyWorkflowStatus = {
  state: 'idle' | 'queued' | 'in_progress' | 'completed' | 'unknown'
  conclusion?: string | null
  workflowFile?: string
  repo?: string
  ref?: string
  actionsUrl?: string
  runUrl?: string
  runNumber?: number | null
  dispatchedAt?: string
  updatedAt?: string
  reviewer?: string
  branchName?: string
  pullRequestUrl?: string
  source: 'github' | 'summary' | 'none'
}

type GithubWorkflowRun = {
  id: number
  html_url?: string
  run_number?: number
  display_title?: string
  status?: string
  conclusion?: string | null
  created_at?: string
  updated_at?: string
}

function resolveGithubRepo() {
  if (process.env.AUTOMATION_GITHUB_REPO?.trim()) {
    return process.env.AUTOMATION_GITHUB_REPO.trim()
  }

  const owner = process.env.VERCEL_GIT_REPO_OWNER?.trim()
  const slug = process.env.VERCEL_GIT_REPO_SLUG?.trim()
  if (owner && slug) {
    return `${owner}/${slug}`
  }

  return null
}

export function getAutomationApplyWorkflowFile() {
  return process.env.AUTOMATION_APPLY_WORKFLOW_FILE?.trim() || 'automation-apply.yml'
}

export function getAutomationApplyWorkflowRef() {
  return (
    process.env.AUTOMATION_WORKFLOW_REF?.trim() ||
    process.env.AUTOMATION_BASE_BRANCH?.trim() ||
    process.env.VERCEL_GIT_COMMIT_REF?.trim() ||
    'main'
  )
}

function getRunTitle(runId: string) {
  return `Automation apply run ${runId}`
}

function mapGithubStatus(status?: string, conclusion?: string | null) {
  if (status === 'completed') {
    return {
      state: 'completed' as const,
      conclusion: conclusion ?? null,
    }
  }

  if (
    status === 'queued' ||
    status === 'waiting' ||
    status === 'pending' ||
    status === 'requested'
  ) {
    return {
      state: 'queued' as const,
      conclusion: null,
    }
  }

  if (status === 'in_progress' || status === 'action_required') {
    return {
      state: 'in_progress' as const,
      conclusion: null,
    }
  }

  return {
    state: 'unknown' as const,
    conclusion: conclusion ?? null,
  }
}

export function getSummaryApplyWorkflowStatus(
  summary: unknown,
): AutomationApplyWorkflowStatus | null {
  if (!summary || typeof summary !== 'object' || !('applyWorkflow' in summary)) {
    return null
  }

  const applyWorkflow = summary.applyWorkflow
  if (!applyWorkflow || typeof applyWorkflow !== 'object') {
    return null
  }

  const workflow = applyWorkflow as AutomationApplyWorkflowSummary
  const rawState = typeof workflow.status === 'string' ? workflow.status : ''
  const state: AutomationApplyWorkflowStatus['state'] =
    rawState === 'queued' ||
    rawState === 'in_progress' ||
    rawState === 'completed' ||
    rawState === 'idle'
      ? rawState
      : 'unknown'

  return {
    state,
    conclusion:
      typeof workflow.conclusion === 'string' || workflow.conclusion === null
        ? workflow.conclusion
        : null,
    workflowFile: workflow.workflowFile,
    repo: workflow.repo,
    ref: workflow.ref,
    actionsUrl: workflow.actionsUrl,
    runUrl: workflow.runUrl,
    runNumber: typeof workflow.runNumber === 'number' ? workflow.runNumber : null,
    dispatchedAt: workflow.dispatchedAt,
    updatedAt: workflow.completedAt || workflow.dispatchedAt,
    reviewer: workflow.reviewer,
    branchName: workflow.branchName,
    pullRequestUrl: workflow.pullRequestUrl,
    source: 'summary',
  }
}

export async function getAutomationApplyWorkflowStatus(
  runId: string,
  summary?: unknown,
): Promise<AutomationApplyWorkflowStatus | null> {
  const statuses = await getAutomationApplyWorkflowStatuses([
    {
      runId,
      summary,
    },
  ])

  return statuses[runId] || null
}

export async function getAutomationApplyWorkflowStatuses(
  runs: Array<{ runId: string; summary?: unknown }>,
): Promise<Record<string, AutomationApplyWorkflowStatus | null>> {
  const summaryStatuses = Object.fromEntries(
    runs.map(({ runId, summary }) => [runId, getSummaryApplyWorkflowStatus(summary)]),
  ) as Record<string, AutomationApplyWorkflowStatus | null>

  const repo = resolveGithubRepo()
  const workflowFile = getAutomationApplyWorkflowFile()
  const token =
    process.env.AUTOMATION_GITHUB_TOKEN?.trim() || process.env.GITHUB_TOKEN?.trim() || ''

  if (!repo || !token) {
    return summaryStatuses
  }

  try {
    const response = await fetch(
      `https://api.github.com/repos/${repo}/actions/workflows/${workflowFile}/runs?event=workflow_dispatch&per_page=30`,
      {
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${token}`,
          'User-Agent': 'MetroMemoryAutomation/1.0',
        },
        cache: 'no-store',
      },
    )

    if (!response.ok) {
      return summaryStatuses
    }

    const payload = (await response.json()) as {
      workflow_runs?: GithubWorkflowRun[]
    }

    const workflowRuns = payload.workflow_runs || []
    const nextStatuses: Record<string, AutomationApplyWorkflowStatus | null> = {
      ...summaryStatuses,
    }

    for (const { runId } of runs) {
      const run = workflowRuns.find(
        (workflowRun) => workflowRun.display_title === getRunTitle(runId),
      )
      const fallback = summaryStatuses[runId]
      if (!run) {
        nextStatuses[runId] = fallback
        continue
      }

      const mapped = mapGithubStatus(run.status, run.conclusion)

      nextStatuses[runId] = {
        state: mapped.state,
        conclusion: mapped.conclusion,
        workflowFile,
        repo,
        ref: fallback?.ref,
        actionsUrl:
          fallback?.actionsUrl || `https://github.com/${repo}/actions/workflows/${workflowFile}`,
        runUrl: run.html_url || fallback?.runUrl,
        runNumber: typeof run.run_number === 'number' ? run.run_number : null,
        dispatchedAt: run.created_at || fallback?.dispatchedAt,
        updatedAt: run.updated_at || fallback?.updatedAt,
        reviewer: fallback?.reviewer,
        branchName: fallback?.branchName,
        pullRequestUrl: fallback?.pullRequestUrl,
        source: 'github',
      }
    }

    return nextStatuses
  } catch {
    return summaryStatuses
  }
}

export function buildQueuedApplyWorkflowSummary({
  runId,
  reviewer,
  repo,
  workflowFile,
  ref,
}: {
  runId: string
  reviewer: string
  repo: string
  workflowFile: string
  ref: string
}) {
  const dispatchedAt = new Date().toISOString()

  return {
    mode: 'github-actions',
    status: 'queued',
    repo,
    workflowFile,
    ref,
    reviewer,
    dispatchedAt,
    actionsUrl: `https://github.com/${repo}/actions/workflows/${workflowFile}`,
    runTitle: getRunTitle(runId),
  }
}

export function buildCompletedApplyWorkflowSummary({
  existingSummary,
  repo,
  workflowFile,
  ref,
  reviewer,
  branchName,
  pullRequestUrl,
  conclusion = 'success',
}: {
  existingSummary: unknown
  repo?: string | null
  workflowFile?: string
  ref?: string
  reviewer: string
  branchName?: string
  pullRequestUrl?: string
  conclusion?: string | null
}) {
  const previous = getSummaryApplyWorkflowStatus(existingSummary)

  return {
    mode: 'github-actions',
    status: 'completed',
    repo: repo || previous?.repo,
    workflowFile: workflowFile || previous?.workflowFile || getAutomationApplyWorkflowFile(),
    ref: ref || previous?.ref || getAutomationApplyWorkflowRef(),
    reviewer,
    dispatchedAt: previous?.dispatchedAt,
    completedAt: new Date().toISOString(),
    actionsUrl:
      previous?.actionsUrl ||
      (repo
        ? `https://github.com/${repo}/actions/workflows/${workflowFile || getAutomationApplyWorkflowFile()}`
        : undefined),
    runUrl: previous?.runUrl,
    runNumber: previous?.runNumber,
    conclusion,
    branchName,
    pullRequestUrl,
  }
}

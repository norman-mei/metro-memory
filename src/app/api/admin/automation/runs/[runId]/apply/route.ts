import { NextResponse } from 'next/server'
import { execFile } from 'node:child_process'
import path from 'node:path'

import {
  getAutomationReviewerLabel,
  isAutomationAdminAuthenticated,
} from '@/lib/adminAuth'
import {
  buildQueuedApplyWorkflowSummary,
  getAutomationApplyWorkflowFile,
  getAutomationApplyWorkflowRef,
  getAutomationApplyWorkflowStatus,
} from '@/lib/automationWorkflowStatus'
import { prisma } from '@/lib/prisma'

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

async function dispatchGithubApplyWorkflow(runId: string, reviewer: string) {
  const token =
    process.env.AUTOMATION_GITHUB_TOKEN?.trim() || process.env.GITHUB_TOKEN?.trim() || ''
  if (!token) {
    throw new Error(
      'Missing AUTOMATION_GITHUB_TOKEN for workflow dispatch. Configure a GitHub token with Actions write access.',
    )
  }

  const repo = resolveGithubRepo()
  if (!repo) {
    throw new Error(
      'Could not resolve the GitHub repository for workflow dispatch. Set AUTOMATION_GITHUB_REPO.',
    )
  }

  const workflowFile = getAutomationApplyWorkflowFile()
  const ref = getAutomationApplyWorkflowRef()

  const response = await fetch(
    `https://api.github.com/repos/${repo}/actions/workflows/${workflowFile}/dispatches`,
    {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'MetroMemoryAutomation/1.0',
      },
      body: JSON.stringify({
        ref,
        inputs: {
          run_id: runId,
          reviewer,
        },
      }),
    },
  )

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`GitHub workflow dispatch failed: ${errorText}`)
  }

  return {
    queued: true,
    mode: 'github-actions',
    repo,
    workflowFile,
    ref,
    actionsUrl: `https://github.com/${repo}/actions/workflows/${workflowFile}`,
    runId,
  }
}

function runLocalApplyScript(runId: string, reviewer: string) {
  return new Promise<any>((resolve, reject) => {
    execFile(
      process.execPath,
      [
        path.join(process.cwd(), 'scripts', 'run-ts.js'),
        path.join('scripts', 'automation', 'apply-run.ts'),
        runId,
        reviewer,
      ],
      {
        cwd: process.cwd(),
        maxBuffer: 20 * 1024 * 1024,
      },
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error((stderr || stdout || error.message).trim() || 'Apply failed.'))
          return
        }

        const output = stdout.trim()
        if (!output) {
          reject(new Error('Apply script returned no output.'))
          return
        }

        try {
          resolve(JSON.parse(output))
        } catch {
          reject(new Error(`Apply script returned invalid JSON: ${output}`))
        }
      },
    )
  })
}

export async function POST(
  _request: Request,
  context: { params: Promise<{ runId: string }> },
) {
  if (!(await isAutomationAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { runId } = await context.params
  const reviewer = await getAutomationReviewerLabel()

  try {
    if (
      process.env.VERCEL === '1' ||
      process.env.AUTOMATION_APPLY_MODE?.trim() === 'github-actions'
    ) {
      const databaseUrl = process.env.DATABASE_URL?.trim() || ''
      if (databaseUrl.startsWith('file:')) {
        throw new Error(
          'GitHub Actions apply requires a shared external DATABASE_URL. A local file-based SQLite database cannot be shared between Vercel and GitHub Actions.',
        )
      }

      const run = await prisma.automationRun.findUnique({
        where: { id: runId },
        select: { id: true, summary: true },
      })

      if (!run) {
        return NextResponse.json({ error: 'Automation run not found.' }, { status: 404 })
      }

      const existingWorkflowStatus = await getAutomationApplyWorkflowStatus(runId, run.summary)
      if (
        existingWorkflowStatus &&
        (existingWorkflowStatus.state === 'queued' ||
          existingWorkflowStatus.state === 'in_progress')
      ) {
        return NextResponse.json(
          {
            error: 'An apply workflow is already queued or running for this run.',
            workflowStatus: existingWorkflowStatus,
          },
          { status: 409 },
        )
      }

      const result = await dispatchGithubApplyWorkflow(runId, reviewer)
      await prisma.automationRun.update({
        where: { id: runId },
        data: {
          summary: {
            ...(typeof run.summary === 'object' && run.summary ? (run.summary as object) : {}),
            applyWorkflow: buildQueuedApplyWorkflowSummary({
              runId,
              reviewer,
              repo: result.repo,
              workflowFile: result.workflowFile,
              ref: result.ref,
            }),
          },
        },
      })
      return NextResponse.json(result, { status: 202 })
    }

    const result = await runLocalApplyScript(runId, reviewer)

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to apply approved candidates.',
      },
      { status: 400 },
    )
  }
}

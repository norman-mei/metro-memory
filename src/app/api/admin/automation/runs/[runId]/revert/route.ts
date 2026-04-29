import { NextResponse } from 'next/server'

import {
  getAutomationReviewerLabel,
  isAutomationAdminAuthenticated,
} from '@/lib/adminAuth'
import { refreshAutomationAuditMetrics } from '@/lib/automationAudit'
import { createAutomationRevertBranchAndPr } from '@/lib/automationGit'
import { prisma } from '@/lib/prisma'

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
    const run = await prisma.automationRun.findUnique({
      where: { id: runId },
      select: {
        id: true,
        source: true,
        scope: true,
        commitSha: true,
        pullRequestUrl: true,
        revertedAt: true,
      },
    })

    if (!run) {
      return NextResponse.json({ error: 'Automation run not found.' }, { status: 404 })
    }

    if (!run.commitSha) {
      return NextResponse.json(
        { error: 'This run does not have a recorded automation commit to revert.' },
        { status: 400 },
      )
    }

    if (run.revertedAt) {
      return NextResponse.json(
        { error: 'This automation run has already been reverted.' },
        { status: 400 },
      )
    }

    const gitResult = await createAutomationRevertBranchAndPr({
      repoRoot: process.cwd(),
      originalCommitSha: run.commitSha,
      branchPrefix: `automation/revert/${runId}`,
      prTitle: `Revert automation run ${runId}`,
      prBody: [
        '## Summary',
        `- Run: \`${run.id}\``,
        `- Source: \`${run.source || 'metro-sync'}\``,
        `- Scope: \`${run.scope || 'all'}\``,
        `- Reverted by: \`${reviewer}\``,
        `- Original commit: \`${run.commitSha}\``,
        ...(run.pullRequestUrl ? [`- Original PR: ${run.pullRequestUrl}`] : []),
      ].join('\n'),
    })

    const revertedAt = new Date()
    const revertRef = `revert:${runId}:${revertedAt.toISOString()}`

    await prisma.automationRun.update({
      where: { id: runId },
      data: {
        revertedAt,
        revertedBy: reviewer,
        revertRef,
        revertBranchName: gitResult.branchName,
        revertCommitSha: gitResult.commitSha,
        revertPullRequestUrl: gitResult.pullRequestUrl || null,
        revertPullRequestNumber: gitResult.pullRequestNumber || null,
      },
    })
    await refreshAutomationAuditMetrics(prisma)

    return NextResponse.json({
      runId,
      revertedAt,
      revertRef,
      git: gitResult,
      warnings: gitResult.warnings,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to create revert PR.',
      },
      { status: 400 },
    )
  }
}

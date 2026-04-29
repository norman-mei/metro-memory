import { applyApprovedCandidatesForRun } from '@/lib/automationApply'
import { createAutomationBranchCommitAndPr } from '@/lib/automationGit'
import { approveAutoApplyEligibleCandidatesForRun } from '@/lib/automationReview'
import { prisma } from '@/lib/prisma'
import {
  buildCompletedApplyWorkflowSummary,
  getAutomationApplyWorkflowFile,
  getAutomationApplyWorkflowRef,
} from '@/lib/automationWorkflowStatus'

type ApplyAutomationRunAndCreatePrInput = {
  runId: string
  reviewer: string
  candidateIds?: string[]
  branchPrefix?: string
  commitMessage?: string
  prTitle?: string
  prBodyIntro?: string[]
}

export async function applyAutomationRunAndCreatePr({
  runId,
  reviewer,
  candidateIds,
  branchPrefix,
  commitMessage,
  prTitle,
  prBodyIntro = [],
}: ApplyAutomationRunAndCreatePrInput) {
  const result = await applyApprovedCandidatesForRun(runId, reviewer, {
    candidateIds,
  })
  const warnings: string[] = []

  if (result.appliedCount > 0 && result.writtenPaths.length > 0) {
    const run = await prisma.automationRun.findUnique({
      where: { id: runId },
      select: {
        source: true,
        scope: true,
        summary: true,
      },
    })

    try {
      const gitResult = await createAutomationBranchCommitAndPr({
        repoRoot: process.cwd(),
        filePaths: result.writtenPaths,
        branchPrefix: branchPrefix || `automation/apply/${runId}`,
        commitMessage: commitMessage || `chore(automation): apply approved run ${runId}`,
        prTitle: prTitle || `Apply approved automation run ${runId}`,
        prBody: [
          '## Summary',
          `- Run: \`${runId}\``,
          `- Source: \`${run?.source || 'metro-sync'}\``,
          `- Scope: \`${run?.scope || 'all'}\``,
          `- Applied by: \`${reviewer}\``,
          `- Applied candidates: ${result.appliedCount}`,
          `- Skipped candidates: ${result.skippedCount}`,
          ...prBodyIntro,
          '',
          '## Files',
          ...result.writtenPaths.map((filePath) => `- \`${filePath}\``),
        ].join('\n'),
      })

      if (gitResult) {
        await prisma.automationRun.update({
          where: { id: runId },
          data: {
            branchName: gitResult.branchName,
            commitSha: gitResult.commitSha,
            pullRequestUrl: gitResult.pullRequestUrl || null,
            pullRequestNumber: gitResult.pullRequestNumber || null,
            summary: {
              ...(typeof run?.summary === 'object' && run.summary
                ? (run.summary as object)
                : {}),
              applyWorkflow: buildCompletedApplyWorkflowSummary({
                existingSummary: run?.summary,
                repo: process.env.AUTOMATION_GITHUB_REPO || null,
                workflowFile: getAutomationApplyWorkflowFile(),
                ref: getAutomationApplyWorkflowRef(),
                reviewer,
                branchName: gitResult.branchName,
                pullRequestUrl: gitResult.pullRequestUrl,
              }),
            },
          },
        })
        warnings.push(...gitResult.warnings)

        return {
          ...result,
          git: gitResult,
          warnings,
        }
      }
    } catch (gitError) {
      warnings.push(
        gitError instanceof Error
          ? gitError.message
          : 'Applied locally, but branch/PR creation failed.',
      )
    }
  }

  return {
    ...result,
    warnings,
  }
}

export async function autoApplyGreenLaneCandidatesForRun(
  runId: string,
  reviewer = process.env.AUTOMATION_AUTO_APPLY_LABEL || 'automation-policy',
) {
  const autoApproved = await approveAutoApplyEligibleCandidatesForRun({
    runId,
    reviewer,
    note: 'Auto-approved by the green-lane automation policy.',
  })

  if (autoApproved.candidateIds.length === 0) {
    return {
      runId,
      autoApprovedCount: 0,
      appliedCount: 0,
      skippedCount: 0,
      warnings: [] as string[],
      note: 'No green-lane candidates were eligible for auto-apply.',
    }
  }

  const result = await applyAutomationRunAndCreatePr({
    runId,
    reviewer,
    candidateIds: autoApproved.candidateIds,
    branchPrefix: `automation/green-lane/${runId}`,
    commitMessage: `chore(automation): auto-apply green lane run ${runId}`,
    prTitle: `Auto-apply green-lane automation run ${runId}`,
    prBodyIntro: [
      `- Green-lane auto-approved candidates: ${autoApproved.candidateIds.length}`,
      '- This PR was created automatically from green-lane claims.',
    ],
  })

  return {
    ...result,
    autoApprovedCount: autoApproved.updatedCount,
  }
}

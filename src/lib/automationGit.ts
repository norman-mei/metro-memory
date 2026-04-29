import fs from 'fs'
import os from 'os'
import path from 'path'
import { execFileSync } from 'node:child_process'

export type AutomationGitResult = {
  baseBranch: string
  branchName: string
  commitSha: string
  pullRequestUrl?: string
  pullRequestNumber?: number
  pushSucceeded: boolean
  warnings: string[]
}

function runGit(args: string[], cwd: string) {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim()
}

function tryGit(args: string[], cwd: string) {
  try {
    return { ok: true as const, output: runGit(args, cwd) }
  } catch (error: any) {
    return {
      ok: false as const,
      error: error?.stderr?.toString?.() || error?.message || String(error),
    }
  }
}

function getOriginUrl(repoRoot: string) {
  return runGit(['remote', 'get-url', 'origin'], repoRoot)
}

function parseGithubRepo(remoteUrl: string) {
  const normalized = remoteUrl.replace(/\.git$/, '')
  const httpsMatch = normalized.match(/github\.com[:/](.+\/.+)$/)
  return httpsMatch?.[1] || null
}

function getBaseBranch(repoRoot: string) {
  if (process.env.AUTOMATION_BASE_BRANCH?.trim()) {
    return process.env.AUTOMATION_BASE_BRANCH.trim()
  }

  const remoteHead = tryGit(
    ['symbolic-ref', '--short', 'refs/remotes/origin/HEAD'],
    repoRoot,
  )
  if (remoteHead.ok) {
    const parts = remoteHead.output.split('/')
    return parts[parts.length - 1] || 'main'
  }

  const currentBranch = tryGit(['rev-parse', '--abbrev-ref', 'HEAD'], repoRoot)
  if (currentBranch.ok && currentBranch.output) {
    return currentBranch.output
  }

  return 'main'
}

function getBaseRef(repoRoot: string, baseBranch: string) {
  const remoteRef = `origin/${baseBranch}`
  const remoteCheck = tryGit(['rev-parse', '--verify', remoteRef], repoRoot)
  if (remoteCheck.ok) return remoteRef

  const localCheck = tryGit(['rev-parse', '--verify', baseBranch], repoRoot)
  if (localCheck.ok) return baseBranch

  return 'HEAD'
}

function ensureParentDir(filePath: string) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
}

function ensureGitIdentity(cwd: string) {
  const configuredName = tryGit(['config', '--get', 'user.name'], cwd)
  if (!configuredName.ok || !configuredName.output.trim()) {
    runGit(
      ['config', 'user.name', process.env.AUTOMATION_GIT_USER_NAME || 'Metro Memory Automation'],
      cwd,
    )
  }

  const configuredEmail = tryGit(['config', '--get', 'user.email'], cwd)
  if (!configuredEmail.ok || !configuredEmail.output.trim()) {
    runGit(
      [
        'config',
        'user.email',
        process.env.AUTOMATION_GIT_USER_EMAIL || 'automation@metro-memory.local',
      ],
      cwd,
    )
  }
}

function copyFilesIntoWorktree(repoRoot: string, worktreeDir: string, filePaths: string[]) {
  for (const relativePath of filePaths) {
    const sourcePath = path.join(repoRoot, relativePath)
    const destinationPath = path.join(worktreeDir, relativePath)
    if (fs.existsSync(sourcePath)) {
      ensureParentDir(destinationPath)
      fs.copyFileSync(sourcePath, destinationPath)
    } else if (fs.existsSync(destinationPath)) {
      fs.rmSync(destinationPath, { force: true })
    }
  }
}

async function createGithubPullRequest({
  repoFullName,
  headBranch,
  baseBranch,
  title,
  body,
}: {
  repoFullName: string
  headBranch: string
  baseBranch: string
  title: string
  body: string
}) {
  const token =
    process.env.AUTOMATION_GITHUB_TOKEN || process.env.GITHUB_TOKEN || ''
  if (!token) return null

  const response = await fetch(`https://api.github.com/repos/${repoFullName}/pulls`, {
    method: 'POST',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'MetroMemoryAutomation/1.0',
    },
    body: JSON.stringify({
      title,
      head: headBranch,
      base: baseBranch,
      body,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`GitHub PR creation failed: ${errorText}`)
  }

  const payload = await response.json()
  return {
    url: payload.html_url as string,
    number: payload.number as number,
  }
}

export async function createAutomationBranchCommitAndPr({
  repoRoot,
  filePaths,
  branchPrefix,
  commitMessage,
  prTitle,
  prBody,
}: {
  repoRoot: string
  filePaths: string[]
  branchPrefix: string
  commitMessage: string
  prTitle: string
  prBody: string
}): Promise<AutomationGitResult | null> {
  const uniquePaths = Array.from(new Set(filePaths.filter(Boolean)))
  if (uniquePaths.length === 0) return null

  const baseBranch = getBaseBranch(repoRoot)
  const baseRef = getBaseRef(repoRoot, baseBranch)
  const safeBranchPrefix = branchPrefix.replace(/[^a-zA-Z0-9/_-]+/g, '-')
  const branchName = `${safeBranchPrefix}-${Date.now()}`
  const worktreeDir = path.join(
    os.tmpdir(),
    `metro-memory-automation-${branchName.replace(/[\\/]/g, '-')}`,
  )
  const warnings: string[] = []
  const originUrl = getOriginUrl(repoRoot)
  const repoFullName =
    process.env.AUTOMATION_GITHUB_REPO || parseGithubRepo(originUrl || '')

  runGit(['worktree', 'add', '-b', branchName, worktreeDir, baseRef], repoRoot)

  try {
    ensureGitIdentity(worktreeDir)
    copyFilesIntoWorktree(repoRoot, worktreeDir, uniquePaths)
    runGit(['add', '--', ...uniquePaths], worktreeDir)

    const diffCheck = tryGit(['diff', '--cached', '--quiet'], worktreeDir)
    if (diffCheck.ok) {
      warnings.push('No staged changes were detected for PR creation.')
      return null
    }

    runGit(['commit', '-m', commitMessage], worktreeDir)
    const commitSha = runGit(['rev-parse', 'HEAD'], worktreeDir)

    const pushResult = tryGit(['push', '-u', 'origin', branchName], worktreeDir)
    let pushSucceeded = false
    if (!pushResult.ok) {
      warnings.push(`Push failed: ${pushResult.error}`)
    } else {
      pushSucceeded = true
    }

    let pullRequestUrl: string | undefined
    let pullRequestNumber: number | undefined
    if (pushSucceeded && repoFullName) {
      try {
        const pr = await createGithubPullRequest({
          repoFullName,
          headBranch: branchName,
          baseBranch,
          title: prTitle,
          body: prBody,
        })
        pullRequestUrl = pr?.url
        pullRequestNumber = pr?.number
      } catch (error: any) {
        warnings.push(error?.message || String(error))
      }
    } else if (!repoFullName) {
      warnings.push('GitHub repo name could not be resolved for PR creation.')
    }

    return {
      baseBranch,
      branchName,
      commitSha,
      pullRequestUrl,
      pullRequestNumber,
      pushSucceeded,
      warnings,
    }
  } finally {
    tryGit(['worktree', 'remove', worktreeDir, '--force'], repoRoot)
    tryGit(['worktree', 'prune'], repoRoot)
  }
}

export async function createAutomationRevertBranchAndPr({
  repoRoot,
  originalCommitSha,
  branchPrefix,
  prTitle,
  prBody,
}: {
  repoRoot: string
  originalCommitSha: string
  branchPrefix: string
  prTitle: string
  prBody: string
}): Promise<AutomationGitResult> {
  const baseBranch = getBaseBranch(repoRoot)
  const baseRef = getBaseRef(repoRoot, baseBranch)
  const branchName = `${branchPrefix.replace(/[^a-zA-Z0-9/_-]+/g, '-')}-${Date.now()}`
  const worktreeDir = path.join(
    os.tmpdir(),
    `metro-memory-revert-${branchName.replace(/[\\/]/g, '-')}`,
  )
  const warnings: string[] = []
  const originUrl = getOriginUrl(repoRoot)
  const repoFullName =
    process.env.AUTOMATION_GITHUB_REPO || parseGithubRepo(originUrl || '')

  runGit(['worktree', 'add', '-b', branchName, worktreeDir, baseRef], repoRoot)

  try {
    ensureGitIdentity(worktreeDir)
    runGit(['revert', '--no-edit', originalCommitSha], worktreeDir)
    const commitSha = runGit(['rev-parse', 'HEAD'], worktreeDir)

    const pushResult = tryGit(['push', '-u', 'origin', branchName], worktreeDir)
    let pushSucceeded = false
    if (!pushResult.ok) {
      warnings.push(`Push failed: ${pushResult.error}`)
    } else {
      pushSucceeded = true
    }

    let pullRequestUrl: string | undefined
    let pullRequestNumber: number | undefined
    if (pushSucceeded && repoFullName) {
      try {
        const pr = await createGithubPullRequest({
          repoFullName,
          headBranch: branchName,
          baseBranch,
          title: prTitle,
          body: prBody,
        })
        pullRequestUrl = pr?.url
        pullRequestNumber = pr?.number
      } catch (error: any) {
        warnings.push(error?.message || String(error))
      }
    } else if (!repoFullName) {
      warnings.push('GitHub repo name could not be resolved for PR creation.')
    }

    return {
      baseBranch,
      branchName,
      commitSha,
      pullRequestUrl,
      pullRequestNumber,
      pushSucceeded,
      warnings,
    }
  } finally {
    tryGit(['worktree', 'remove', worktreeDir, '--force'], repoRoot)
    tryGit(['worktree', 'prune'], repoRoot)
  }
}

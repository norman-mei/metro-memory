import { applyAutomationRunAndCreatePr } from '../../src/lib/automationAutopilot.ts'
import nodemailer from 'nodemailer'

const [, , runId, reviewerArg] = process.argv

async function sendAutomationOpsEmail(subject: string, body: string) {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com'
  const port = Number(process.env.SMTP_PORT || 587)
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  const to = process.env.SMTP_TO
  const from = process.env.SMTP_FROM || user

  if (!user || !pass || !to) return

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  })

  await transporter.sendMail({ from, to, subject, text: body })
}

async function main() {
  if (!runId) {
    throw new Error('Missing runId argument.')
  }

  const reviewer = reviewerArg || 'automation-admin'
  const result = await applyAutomationRunAndCreatePr({
    runId,
    reviewer,
  })

  await sendAutomationOpsEmail(
    result.git?.pullRequestUrl
      ? `Automation apply complete for ${runId}`
      : `Automation apply finished for ${runId}`,
    [
      `Run: ${runId}`,
      `Reviewer: ${reviewer}`,
      `Applied: ${result.appliedCount}`,
      `Skipped: ${result.skippedCount}`,
      `Warnings: ${result.warnings.length}`,
      result.git?.pullRequestUrl ? `PR: ${result.git.pullRequestUrl}` : 'PR: none',
      result.warnings.length ? '' : '',
      ...result.warnings,
    ].join('\n'),
  ).catch(() => {})

  process.stdout.write(`${JSON.stringify(result)}\n`)
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  sendAutomationOpsEmail(
    `Automation apply failed for ${runId || 'unknown run'}`,
    error instanceof Error ? `${error.message}\n\n${error.stack || ''}` : String(error),
  ).catch(() => {})
  process.stderr.write(`${message}\n`)
  process.exit(1)
})

import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import nodemailer from 'nodemailer'

import { assertMailerEnvironment, getAuthBaseUrl } from '@/lib/authEnvironment'

const {
  BREVO_HOST,
  BREVO_PORT,
  BREVO_USER,
  BREVO_PASS,
  MAIL_FROM_NAME,
  MAIL_FROM_EMAIL,
} = process.env

const transporter = nodemailer.createTransport({
  host: BREVO_HOST,
  port: Number(BREVO_PORT ?? 587),
  secure: Number(BREVO_PORT ?? 587) === 465,
  auth: {
    user: BREVO_USER,
    pass: BREVO_PASS,
  },
})

function buildFromAddress() {
  if (MAIL_FROM_NAME && MAIL_FROM_EMAIL) {
    return `"${MAIL_FROM_NAME}" <${MAIL_FROM_EMAIL}>`
  }
  if (MAIL_FROM_EMAIL) {
    return MAIL_FROM_EMAIL
  }
  return 'Metro Memory <no-reply@metromemory.com>'
}

async function captureAuthEmail(message: {
  to: string
  subject: string
  text: string
  html: string
}) {
  const captureDir = process.env.AUTH_EMAIL_CAPTURE_DIR?.trim()
  if (!captureDir) return false

  await mkdir(captureDir, { recursive: true })
  const filename = path.join(
    captureDir,
    `${Date.now().toString(36)}-${message.subject.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.json`,
  )
  await writeFile(
    filename,
    JSON.stringify(
      {
        createdAt: new Date().toISOString(),
        ...message,
      },
      null,
      2,
    ),
    'utf8',
  )

  return true
}

async function sendAuthEmail(message: {
  to: string
  subject: string
  text: string
  html: string
}) {
  if (await captureAuthEmail(message)) {
    return
  }

  assertMailerEnvironment()

  await transporter.sendMail({
    from: buildFromAddress(),
    ...message,
  })
}

export async function sendVerificationEmail(to: string, token: string, newEmail?: string) {
  const baseUrl = getAuthBaseUrl()
  const verifyUrl = new URL('/api/auth/verify-email', baseUrl)
  verifyUrl.searchParams.set('token', token)
  if (newEmail) {
    verifyUrl.searchParams.set('newEmail', newEmail)
  }

  const isEmailChange = Boolean(newEmail)
  const subject = isEmailChange
    ? 'Confirm your new Metro Memory email'
    : 'Verify your Metro Memory account'
  const text = isEmailChange
    ? [
        'You requested to change your Metro Memory sign-in email.',
        '',
        'Click the link below to confirm this new address:',
        verifyUrl.toString(),
        '',
        'If you did not request this, you can safely ignore this message and your account email will stay the same.',
      ].join('\n')
    : [
        'Welcome to Metro Memory!',
        '',
        'Click the link below to verify your email address and activate your account:',
        verifyUrl.toString(),
        '',
        'If you did not create this account, you can safely ignore this message.',
      ].join('\n')

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #0f172a;">
      <h2 style="color: #0ea5e9; margin-bottom: 16px;">One quick step left</h2>
      <p>${
        isEmailChange
          ? 'Tap the button below to confirm your new sign-in email for Metro Memory.'
          : 'Tap the button below to verify your email address and finish setting up your Metro Memory account.'
      }</p>
      <p style="margin: 24px 0;">
        <a
          href="${verifyUrl.toString()}"
          style="
            display: inline-block;
            padding: 12px 24px;
            background-color: #0ea5e9;
            color: #ffffff;
            text-decoration: none;
            border-radius: 999px;
            font-weight: 600;
          "
        >
          Verify email
        </a>
      </p>
      <p>If the button does not work, copy and paste this link into your browser:</p>
      <p style="word-break: break-all;">
        <a href="${verifyUrl.toString()}" style="color: #0ea5e9;">
          ${verifyUrl.toString()}
        </a>
      </p>
      <p style="margin-top: 24px;">You can ignore this email if you did not create an account.</p>
    </div>
  `

  await sendAuthEmail({
    to,
    subject,
    text,
    html,
  })
}

export async function sendPasswordResetEmail(to: string, token: string) {
  const baseUrl = getAuthBaseUrl()
  const resetUrl = new URL('/', baseUrl)
  resetUrl.searchParams.set('tab', 'account')
  resetUrl.searchParams.set('resetToken', token)

  const subject = 'Reset your Metro Memory password'
  const text = [
    'You requested a password reset for your Metro Memory account.',
    '',
    'Reset token:',
    token,
    '',
    'If available in your app, you can also open:',
    resetUrl.toString(),
    '',
    'If you did not request this, you can safely ignore this message.',
  ].join('\n')

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #0f172a;">
      <h2 style="color: #0ea5e9; margin-bottom: 16px;">Password reset requested</h2>
      <p>Use this reset token in Metro Memory or Rail Map Toolkit:</p>
      <p style="font-size: 18px; font-weight: 700; letter-spacing: 0.04em;">
        ${token}
      </p>
      <p style="margin-top: 20px;">You can also open:</p>
      <p style="word-break: break-all;">
        <a href="${resetUrl.toString()}" style="color: #0ea5e9;">
          ${resetUrl.toString()}
        </a>
      </p>
      <p style="margin-top: 24px;">If you did not request this, you can safely ignore this email.</p>
    </div>
  `

  await sendAuthEmail({
    to,
    subject,
    text,
    html,
  })
}

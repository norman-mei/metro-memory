import nodemailer, { type Transporter } from 'nodemailer'

type SendEmailParams = {
  to: string
  subject: string
  html: string
  text: string
}

let transporter: Transporter | null = null

const smtpHost = process.env.SMTP_HOST
const smtpPort = process.env.SMTP_PORT
const smtpUser = process.env.SMTP_USER
const smtpPass = process.env.SMTP_PASS
const emailFrom = process.env.EMAIL_FROM ?? 'Metro Memory <no-reply@localhost>'

function getBaseUrl() {
  return (
    process.env.APP_BASE_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    'http://localhost:3000'
  )
}

function getTransporter() {
  if (transporter) {
    return transporter
  }

  const looksConfigured =
    smtpHost &&
    smtpPort &&
    smtpUser &&
    smtpPass &&
    !/example\.com$/i.test(String(smtpHost)) &&
    smtpUser !== 'smtp-user' &&
    smtpPass !== 'smtp-password'

  if (!looksConfigured) {
    return null
  }

  transporter = nodemailer.createTransport({
    host: smtpHost,
    port: Number(smtpPort),
    secure: Number(smtpPort) === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  })

  return transporter
}

export async function sendEmail({
  to,
  subject,
  html,
  text,
}: SendEmailParams): Promise<void> {
  const transport = getTransporter()
  if (!transport) {
    console.info(
      '[email] SMTP not configured. Email contents:',
      JSON.stringify({ to, subject, text }, null, 2),
    )
    return
  }

  try {
    await transport.sendMail({
      from: emailFrom,
      to,
      subject,
      text,
      html,
    })
  } catch (error) {
    console.error('[email] Failed to send email via SMTP.', error)
    throw error
  }
}

export async function sendVerificationEmail(
  to: string,
  token: string,
): Promise<void> {
  const baseUrl = getBaseUrl()
  const verifyUrl = `${baseUrl}/verify-email?token=${encodeURIComponent(token)}`
  const text = `Welcome to Metro Memory!

Please verify your account by clicking the link below:
${verifyUrl}

If you did not sign up, please ignore this email.`

  const html = `
    <p>Welcome to Metro Memory!</p>
    <p>Please verify your account by clicking the link below:</p>
    <p><a href="${verifyUrl}">Verify your email</a></p>
    <p>If you did not sign up, you can ignore this email.</p>
  `

  await sendEmail({
    to,
    subject: 'Verify your Metro Memory account',
    text,
    html,
  })
}

export async function sendPasswordResetEmail(
  to: string,
  token: string,
): Promise<void> {
  const baseUrl = getBaseUrl()
  const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`
  const text = `We received a request to reset your Metro Memory password.

Reset your password using the link below (valid for 1 hour):
${resetUrl}

If you did not request this, you can ignore this email.`

  const html = `
    <p>We received a request to reset your Metro Memory password.</p>
    <p><a href="${resetUrl}">Reset your password</a> (valid for 1 hour)</p>
    <p>If you did not request this, feel free to ignore this email.</p>
  `

  await sendEmail({
    to,
    subject: 'Reset your Metro Memory password',
    text,
    html,
  })
}

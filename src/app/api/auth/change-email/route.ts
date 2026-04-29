import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { z } from 'zod'

import { getCurrentUser, normalizeEmail, verifyPassword } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendVerificationEmail } from '@/lib/mailer'
import { hashValue } from '@/lib/auth'
import { buildAuthErrorResponse } from '@/lib/authRouteSupport'

const changeEmailSchema = z.object({
  newEmail: z.string().email(),
  currentPassword: z.string().min(1),
})

export async function POST(request: Request) {
  let debugStage = 'load-current-user'
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    debugStage = 'parse-json'
    const json = await request.json().catch(() => null)
    debugStage = 'validate-input'
    const parsed = changeEmailSchema.safeParse(json)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }

    debugStage = 'normalize-email'
    const normalizedEmail = normalizeEmail(parsed.data.newEmail)

    if (normalizedEmail === user.email) {
      return NextResponse.json({ error: 'Email is unchanged' }, { status: 400 })
    }

    debugStage = 'verify-password'
    const isPasswordValid = await verifyPassword(
      parsed.data.currentPassword,
      user.passwordHash,
    )

    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Incorrect password' }, { status: 403 })
    }

    debugStage = 'check-existing-email'
    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Email is already in use' },
        { status: 409 },
      )
    }

    debugStage = 'set-pending-email'
    await prisma.user.update({
      where: { id: user.id },
      data: { pendingEmail: normalizedEmail },
    })

    debugStage = 'clear-verification-tokens'
    await prisma.verificationToken.deleteMany({
      where: { userId: user.id, type: 'EMAIL' },
    })

    debugStage = 'create-verification-token'
    const rawToken = crypto.randomBytes(48).toString('hex')
    const tokenHash = hashValue(`${rawToken}:${normalizedEmail}`)

    await prisma.verificationToken.create({
      data: {
        userId: user.id,
        tokenHash,
        type: 'EMAIL',
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
      },
    })

    debugStage = 'send-verification-email'
    await sendVerificationEmail(normalizedEmail, rawToken, normalizedEmail)

    return NextResponse.json({
      message:
        'Check your inbox to verify the new email. Your current email stays active until you confirm.',
      user: {
        id: user.id,
        email: user.email,
      },
    })
  } catch (error) {
    return buildAuthErrorResponse({
      request,
      route: 'change-email',
      stage: debugStage,
      error,
      message: 'Unable to change email. Please try again.',
    })
  }
}

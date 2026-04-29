import { NextResponse } from 'next/server'
import { z } from 'zod'

import { prisma } from '@/lib/prisma'
import { buildAuthErrorResponse } from '@/lib/authRouteSupport'
import {
  clearVerificationTokensForUser,
  createVerificationToken,
  getCurrentUser,
  normalizeEmail,
} from '@/lib/auth'
import { sendVerificationEmail } from '@/lib/mailer'

const bodySchema = z.object({
  email: z.string().email().optional(),
})

export async function POST(request: Request) {
  let debugStage = 'parse-request'
  try {
    debugStage = 'load-current-user'
    const authUser = await getCurrentUser()
    debugStage = 'parse-json'
    const json = await request.json().catch(() => null)
    debugStage = 'validate-input'
    const parsed = bodySchema.safeParse(json)

    let targetEmail: string | null = null
    if (authUser) {
      targetEmail = authUser.email
    } else if (parsed.success && parsed.data.email) {
      debugStage = 'normalize-email'
      targetEmail = normalizeEmail(parsed.data.email)
    }

    if (!targetEmail) {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 })
    }

    debugStage = 'find-user'
    const user = await prisma.user.findUnique({
      where: { email: targetEmail },
    })

    if (!user) {
      return NextResponse.json({
        message: 'If that account exists, a verification email was sent.',
      })
    }

    if (user.emailVerifiedAt) {
      return NextResponse.json({
        message: 'That account is already verified.',
      })
    }

    debugStage = 'clear-verification-tokens'
    await clearVerificationTokensForUser(user.id)
    debugStage = 'create-verification-token'
    const { token } = await createVerificationToken(user.id)
    debugStage = 'send-verification-email'
    await sendVerificationEmail(user.email, token)

    return NextResponse.json({
      message: 'Verification email sent. Please check your inbox.',
    })
  } catch (error) {
    return buildAuthErrorResponse({
      request,
      route: 'resend-verification',
      stage: debugStage,
      error,
      message: 'Unable to resend verification email. Please try again later.',
    })
  }
}

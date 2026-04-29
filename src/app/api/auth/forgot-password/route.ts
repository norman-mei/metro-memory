import { NextResponse } from 'next/server'
import { z } from 'zod'

import { sendPasswordResetEmail } from '@/lib/mailer'
import { prisma } from '@/lib/prisma'
import { buildAuthErrorResponse } from '@/lib/authRouteSupport'
import {
  clearPasswordResetTokensForUser,
  createPasswordResetToken,
  normalizeEmail,
} from '@/lib/auth'

const forgotPasswordSchema = z.object({
  email: z.string().email(),
})

const GENERIC_MESSAGE =
  'If that account exists, a password reset email was sent.'

export async function POST(request: Request) {
  let debugStage = 'parse-request'
  try {
    debugStage = 'parse-json'
    const json = await request.json().catch(() => null)
    debugStage = 'validate-input'
    const parsed = forgotPasswordSchema.safeParse(json)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }

    debugStage = 'normalize-email'
    const email = normalizeEmail(parsed.data.email)
    debugStage = 'find-user'
    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      return NextResponse.json({
        message: GENERIC_MESSAGE,
      })
    }

    try {
      debugStage = 'clear-reset-tokens'
      await clearPasswordResetTokensForUser(user.id)
      debugStage = 'create-reset-token'
      const { token } = await createPasswordResetToken(user.id)
      debugStage = 'send-reset-email'
      await sendPasswordResetEmail(user.email, token)
    } catch (error) {
      const response = buildAuthErrorResponse({
        request,
        route: 'forgot-password-mail',
        stage: debugStage,
        error,
        message: GENERIC_MESSAGE,
        status: 200,
        metadata: { email: user.email },
      })
      return response
    }

    return NextResponse.json({
      message: GENERIC_MESSAGE,
    })
  } catch (error) {
    return buildAuthErrorResponse({
      request,
      route: 'forgot-password',
      stage: debugStage,
      error,
      message: GENERIC_MESSAGE,
      status: 200,
    })
  }
}

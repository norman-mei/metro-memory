import { NextResponse } from 'next/server'
import { z } from 'zod'

import { prisma } from '@/lib/prisma'
import { createSession, normalizeEmail, verifyPassword } from '@/lib/auth'
import { buildAuthErrorResponse } from '@/lib/authRouteSupport'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  rememberMe: z.boolean().optional(),
})

export async function POST(request: Request) {
  let debugStage = 'parse-request'
  try {
    debugStage = 'parse-json'
    const json = await request.json().catch(() => null)
    debugStage = 'validate-input'
    const parsed = loginSchema.safeParse(json)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 400 },
      )
    }

    debugStage = 'normalize-email'
    const email = normalizeEmail(parsed.data.email)
    debugStage = 'find-user'
    const user = await prisma.user.findUnique({
      where: { email },
    })

    debugStage = 'verify-password'
    if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 },
      )
    }

    if (!user.emailVerifiedAt) {
      return NextResponse.json(
        { error: 'Please verify your email before logging in.' },
        { status: 403 },
      )
    }

    debugStage = 'create-session'
    await createSession(user.id, Boolean(parsed.data.rememberMe))

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        adFree: user.adFree ?? false,
      },
    })
  } catch (error) {
    return buildAuthErrorResponse({
      request,
      route: 'login',
      stage: debugStage,
      error,
      message: 'Unable to log in. Please try again.',
    })
  }
}

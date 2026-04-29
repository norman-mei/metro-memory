import { NextResponse } from 'next/server'
import { z } from 'zod'

import { prisma } from '@/lib/prisma'
import {
  clearVerificationTokensForUser,
  createVerificationToken,
  hashPassword,
  normalizeEmail,
} from '@/lib/auth'
import { buildAuthErrorResponse, buildAuthDebugId } from '@/lib/authRouteSupport'
import { sendVerificationEmail } from '@/lib/mailer'

const registerSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(8),
    confirmPassword: z.string().min(8),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export async function POST(request: Request) {
  let debugStage = 'parse-request'
  try {
    debugStage = 'parse-json'
    const json = await request.json().catch(() => null)
    debugStage = 'validate-input'
    const parsed = registerSchema.safeParse(json)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.format() },
        { status: 400 },
      )
    }

    const { email, password } = parsed.data

    debugStage = 'normalize-email'
    const normalizedEmail = normalizeEmail(email)
    debugStage = 'hash-password'
    const passwordHash = await hashPassword(password)

    debugStage = 'check-existing-user'
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email is already registered' },
        { status: 409 },
      )
    }

    debugStage = 'create-user'
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
      },
    })

    try {
      debugStage = 'clear-verification-tokens'
      await clearVerificationTokensForUser(user.id)
      debugStage = 'create-verification-token'
      const { token } = await createVerificationToken(user.id)
      debugStage = 'send-verification-email'
      await sendVerificationEmail(user.email, token)
    } catch (error) {
      await prisma.user.delete({
        where: { id: user.id },
      })
      await clearVerificationTokensForUser(user.id)
      return buildAuthErrorResponse({
        request,
        route: 'register-mail',
        debugId: buildAuthDebugId('register-mail'),
        stage: debugStage,
        error,
        message: 'Unable to send verification email. Please try again later.',
        metadata: { email: user.email },
      })
    }

    return NextResponse.json({
      message: 'Account created. Check your email for a verification link.',
    })
  } catch (error) {
    return buildAuthErrorResponse({
      request,
      route: 'register',
      stage: debugStage,
      error,
      message: 'Unable to create account. Please try again.',
    })
  }
}

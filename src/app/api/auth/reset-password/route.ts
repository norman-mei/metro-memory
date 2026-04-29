import { NextResponse } from 'next/server'
import { z } from 'zod'

import { hashPassword, hashValue } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { buildAuthErrorResponse } from '@/lib/authRouteSupport'

const resetPasswordSchema = z
  .object({
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
    debugStage = 'read-token'
    const url = new URL(request.url)
    const token = url.searchParams.get('token')
    if (!token) {
      return NextResponse.json({ error: 'Missing token' }, { status: 400 })
    }

    debugStage = 'parse-json'
    const json = await request.json().catch(() => null)
    debugStage = 'validate-input'
    const parsed = resetPasswordSchema.safeParse(json)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }

    debugStage = 'find-reset-token'
    const tokenHash = hashValue(token)
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    })

    if (!resetToken) {
      return NextResponse.json(
        { error: 'Invalid or expired reset token' },
        { status: 400 },
      )
    }

    if (resetToken.expiresAt < new Date()) {
      debugStage = 'delete-expired-reset-token'
      await prisma.passwordResetToken.delete({
        where: { id: resetToken.id },
      })
      return NextResponse.json(
        { error: 'Invalid or expired reset token' },
        { status: 400 },
      )
    }

    debugStage = 'hash-password'
    const passwordHash = await hashPassword(parsed.data.password)

    debugStage = 'update-user-password'
    await prisma.user.update({
      where: { id: resetToken.userId },
      data: {
        passwordHash,
      },
    })

    debugStage = 'delete-reset-tokens'
    await prisma.passwordResetToken.deleteMany({
      where: { userId: resetToken.userId },
    })

    debugStage = 'delete-sessions'
    await prisma.session.deleteMany({
      where: { userId: resetToken.userId },
    })

    return NextResponse.json({
      message: 'Password reset successfully.',
    })
  } catch (error) {
    return buildAuthErrorResponse({
      request,
      route: 'reset-password',
      stage: debugStage,
      error,
      message: 'Unable to reset password. Please try again.',
    })
  }
}

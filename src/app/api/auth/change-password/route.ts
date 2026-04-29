import { NextResponse } from 'next/server'
import { z } from 'zod'

import { getCurrentUser, hashPassword, verifyPassword } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { buildAuthErrorResponse } from '@/lib/authRouteSupport'

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8),
    confirmPassword: z.string().min(8),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
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
    const parsed = changePasswordSchema.safeParse(json)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }

    debugStage = 'verify-password'
    const isPasswordValid = await verifyPassword(
      parsed.data.currentPassword,
      user.passwordHash,
    )

    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Incorrect password' }, { status: 403 })
    }

    debugStage = 'hash-password'
    const passwordHash = await hashPassword(parsed.data.newPassword)

    debugStage = 'update-user'
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
      },
    })

    debugStage = 'delete-reset-tokens'
    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id },
    })

    return NextResponse.json({ message: 'Password updated successfully.' })
  } catch (error) {
    return buildAuthErrorResponse({
      request,
      route: 'change-password',
      stage: debugStage,
      error,
      message: 'Unable to change password. Please try again.',
    })
  }
}

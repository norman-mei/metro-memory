import { NextResponse } from 'next/server'
import { z } from 'zod'

import { prisma } from '@/lib/prisma'
import {
  clearSessionCookie,
  consumePasswordResetToken,
  hashPassword,
} from '@/lib/auth'

const resetSchema = z.object({
  token: z.string().min(10),
  password: z.string().min(8),
})

export async function POST(request: Request) {
  const json = await request.json().catch(() => null)
  const parsed = resetSchema.safeParse(json)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const userId = await consumePasswordResetToken(parsed.data.token)
  if (!userId) {
    return NextResponse.json({ error: 'Token is invalid or has expired' }, { status: 400 })
  }

  const passwordHash = await hashPassword(parsed.data.password)
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  })

  await clearSessionCookie()

  return NextResponse.json({ message: 'Password updated. You can log in now.' })
}

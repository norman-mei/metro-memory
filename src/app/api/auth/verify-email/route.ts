import { NextResponse } from 'next/server'
import { z } from 'zod'

import { prisma } from '@/lib/prisma'
import {
  consumeVerificationToken,
  createSession,
  normalizeEmail,
} from '@/lib/auth'

const verifySchema = z.object({
  token: z.string().min(10),
})

export async function POST(request: Request) {
  const json = await request.json().catch(() => null)
  const parsed = verifySchema.safeParse(json)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid verification token' }, { status: 400 })
  }

  const userId = await consumeVerificationToken(parsed.data.token)
  if (!userId) {
    return NextResponse.json({ error: 'Token is invalid or has expired' }, { status: 400 })
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      emailVerifiedAt: new Date(),
    },
  })

  await createSession(user.id)

  return NextResponse.json({
    user: {
      id: user.id,
      email: normalizeEmail(user.email),
      emailVerified: true,
    },
  })
}

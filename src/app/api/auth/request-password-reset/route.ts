import { NextResponse } from 'next/server'
import { z } from 'zod'

import { prisma } from '@/lib/prisma'
import {
  createPasswordResetToken,
  normalizeEmail,
} from '@/lib/auth'
import { sendPasswordResetEmail } from '@/lib/email'

const requestSchema = z.object({
  email: z.string().email(),
})

export async function POST(request: Request) {
  const json = await request.json().catch(() => null)
  const parsed = requestSchema.safeParse(json)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
  }

  const email = normalizeEmail(parsed.data.email)
  const user = await prisma.user.findUnique({
    where: { email },
  })

  if (user && user.emailVerifiedAt) {
    const token = await createPasswordResetToken(user.id)
    await sendPasswordResetEmail(email, token)
  }

  return NextResponse.json({
    message: 'If an account exists for that email, a reset link has been sent.',
  })
}

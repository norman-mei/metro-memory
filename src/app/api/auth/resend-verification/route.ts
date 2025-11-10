import { NextResponse } from 'next/server'
import { z } from 'zod'

import { prisma } from '@/lib/prisma'
import {
  createVerificationToken,
  normalizeEmail,
} from '@/lib/auth'
import { sendVerificationEmail } from '@/lib/email'

const bodySchema = z.object({
  email: z.string().email(),
})

export async function POST(request: Request) {
  const json = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(json)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
  }

  const email = normalizeEmail(parsed.data.email)
  const user = await prisma.user.findUnique({
    where: { email },
  })

  if (user && !user.emailVerifiedAt) {
    const token = await createVerificationToken(user.id)
    await sendVerificationEmail(email, token)
  }

  return NextResponse.json({
    message: 'If that account exists, a new verification email has been sent.',
  })
}

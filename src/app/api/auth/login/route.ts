import { NextResponse } from 'next/server'
import { z } from 'zod'

import { prisma } from '@/lib/prisma'
import { createSession, normalizeEmail, verifyPassword } from '@/lib/auth'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export async function POST(request: Request) {
  const json = await request.json().catch(() => null)
  const parsed = loginSchema.safeParse(json)

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid credentials' },
      { status: 400 },
    )
  }

  const email = normalizeEmail(parsed.data.email)
  const user = await prisma.user.findUnique({
    where: { email },
  })

  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return NextResponse.json(
      { error: 'Invalid credentials' },
      { status: 401 },
    )
  }

  await createSession(user.id)

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
    },
  })
}

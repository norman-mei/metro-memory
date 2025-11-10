import { NextResponse } from 'next/server'
import { z } from 'zod'

import { prisma } from '@/lib/prisma'
import { hashPassword, normalizeEmail } from '@/lib/auth'

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
  const json = await request.json().catch(() => null)
  const parsed = registerSchema.safeParse(json)

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.format() },
      { status: 400 },
    )
  }

  const { email, password } = parsed.data

  const normalizedEmail = normalizeEmail(email)
  const passwordHash = await hashPassword(password)

  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  })

  if (existingUser) {
    return NextResponse.json(
      { error: 'Email is already registered' },
      { status: 409 },
    )
  }

  await prisma.user.create({
    data: {
      email: normalizedEmail,
      passwordHash,
      emailVerifiedAt: new Date(),
    },
  })

  return NextResponse.json({
    message: 'Account created! You can now log in.',
  })
}

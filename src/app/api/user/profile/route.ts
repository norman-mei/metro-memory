import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const profileSchema = z.object({
  displayName: z
    .string()
    .trim()
    .max(32, 'Display name must be 32 characters or fewer.')
    .optional(),
})

export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.json({
    profile: {
      displayName: user.displayName ?? null,
      email: user.email,
    },
  })
}

export async function PATCH(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const parsed = profileSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid profile payload.' }, { status: 400 })
  }

  const nextDisplayName = parsed.data.displayName?.trim() || null

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      displayName: nextDisplayName,
    },
    select: {
      email: true,
      displayName: true,
    },
  })

  return NextResponse.json({
    profile: {
      email: updated.email,
      displayName: updated.displayName,
    },
  })
}

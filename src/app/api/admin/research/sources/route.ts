import { NextResponse } from 'next/server'
import { z } from 'zod'

import { isAutomationAdminAuthenticated } from '@/lib/adminAuth'
import { prisma } from '@/lib/prisma'

const schema = z.object({
  domain: z.string().min(1).max(255),
  tier: z.number().int().min(1).max(3).optional(),
  blocked: z.boolean().optional(),
  notes: z.string().max(1000).optional(),
})

export async function POST(request: Request) {
  if (!(await isAutomationAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid source payload.' }, { status: 400 })
  }

  const domain = parsed.data.domain.trim().toLowerCase().replace(/^www\./, '')
  try {
    const source = await prisma.sourceDomain.upsert({
      where: { domain },
      create: {
        domain,
        tier: parsed.data.tier ?? 2,
        blocked: parsed.data.blocked ?? false,
        notes: parsed.data.notes ?? null,
      },
      update: {
        ...(parsed.data.tier != null ? { tier: parsed.data.tier } : {}),
        ...(parsed.data.blocked != null ? { blocked: parsed.data.blocked } : {}),
        ...(parsed.data.notes != null ? { notes: parsed.data.notes } : {}),
      },
    })
    return NextResponse.json({ source })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save source.' },
      { status: 400 },
    )
  }
}

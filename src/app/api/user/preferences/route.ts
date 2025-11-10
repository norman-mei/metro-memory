import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  mergeCollapsedSections,
  normalizeUiPreferences,
} from '@/lib/preferences'

const preferencesSchema = z.object({
  collapsedSections: z.record(z.string(), z.boolean()).optional(),
})

export async function PATCH(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const json = await request.json().catch(() => null)
  const parsed = preferencesSchema.safeParse(json)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const existingPreferences = normalizeUiPreferences(user.uiPreferences)

  const nextPreferences = parsed.data.collapsedSections
    ? {
        ...existingPreferences,
        collapsedSections: mergeCollapsedSections(
          existingPreferences.collapsedSections,
          parsed.data.collapsedSections,
        ),
      }
    : existingPreferences

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      uiPreferences: nextPreferences,
    },
  })

  return NextResponse.json({
    preferences: normalizeUiPreferences(updated.uiPreferences),
  })
}

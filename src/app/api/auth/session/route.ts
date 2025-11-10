import { NextResponse } from 'next/server'

import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { normalizeUiPreferences } from '@/lib/preferences'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ user: null, progressSummaries: [] })
  }

  const progress = await prisma.progress.findMany({
    where: { userId: user.id },
  })

  const summaries = progress.map((entry) => {
    const raw = Array.isArray(entry.foundIds) ? entry.foundIds : []
    const foundIds = raw.filter((id): id is number => typeof id === 'number')
    return {
      citySlug: entry.citySlug,
      foundCount: new Set(foundIds).size,
    }
  })

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
    },
    progressSummaries: summaries,
    uiPreferences: normalizeUiPreferences(user.uiPreferences),
  })
}

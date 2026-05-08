import { NextResponse } from 'next/server'

import { getCurrentUser } from '@/lib/auth'
import { buildAuthDebugId, logAuthRouteError } from '@/lib/authRouteSupport'
import { deriveMiniCityProgressSummaries } from '@/lib/miniCityProgressServer'
import { normalizeUiPreferences } from '@/lib/preferences'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ user: null, progressSummaries: [] })
    }

    const progress = await prisma.progress.findMany({
      where: { userId: user.id },
    })

    const summaries = await deriveMiniCityProgressSummaries(progress)

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        adFree: user.adFree ?? false,
      },
      progressSummaries: summaries,
      uiPreferences: normalizeUiPreferences(user.uiPreferences),
    })
  } catch (error) {
    logAuthRouteError('session', buildAuthDebugId('session'), 'load-session', error)
    return NextResponse.json(
      { user: null, progressSummaries: [] },
      { status: 503 },
    )
  }
}

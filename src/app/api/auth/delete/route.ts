import { NextResponse } from 'next/server'

import { clearSessionCookie, getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { buildAuthErrorResponse } from '@/lib/authRouteSupport'

export async function POST(request: Request) {
  let debugStage = 'load-current-user'
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    debugStage = 'delete-user'
    await prisma.user.delete({
      where: { id: user.id },
    })

    debugStage = 'clear-session'
    await clearSessionCookie()

    return NextResponse.json({ ok: true })
  } catch (error) {
    return buildAuthErrorResponse({
      request,
      route: 'delete-account',
      stage: debugStage,
      error,
      message: 'Unable to delete account. Please try again.',
    })
  }
}

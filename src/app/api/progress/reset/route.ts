import { NextRequest, NextResponse } from 'next/server'

import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    let citySlugs: string[] = []
    try {
      const body = await request.json()
      if (Array.isArray(body?.citySlugs)) {
        citySlugs = body.citySlugs.filter(
          (slug: unknown): slug is string => typeof slug === 'string' && slug.length > 0,
        )
      }
    } catch {
      // ignore body parse errors; fallback to deleting everything
    }

    await prisma.progress.deleteMany({
      where: {
        userId: user.id,
        ...(citySlugs.length > 0
          ? {
              citySlug: {
                in: citySlugs,
              },
            }
          : {}),
      },
    })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json(
      { error: 'Unable to reset progress' },
      { status: 500 },
    )
  }
}

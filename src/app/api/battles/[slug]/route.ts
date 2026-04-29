import { NextRequest, NextResponse } from 'next/server'

import { getBattleSnapshotBySlug } from '@/lib/battles'

type RouteParams = {
  params: Promise<{
    slug: string
  }>
}

export async function GET(_: NextRequest, { params }: RouteParams) {
  const { slug } = await params
  const battle = await getBattleSnapshotBySlug(slug)
  if (!battle) {
    return NextResponse.json({ error: 'Battle not found.' }, { status: 404 })
  }

  return NextResponse.json({ battle })
}

import { NextResponse } from 'next/server'

import { getCurrentUser } from '@/lib/auth'
import { getAnalyticsSnapshot } from '@/lib/progression'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const analytics = await getAnalyticsSnapshot(user.id)
  return NextResponse.json({ analytics })
}

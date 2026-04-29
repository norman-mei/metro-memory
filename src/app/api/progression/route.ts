import { NextResponse } from 'next/server'

import { getCurrentUser } from '@/lib/auth'
import { getProgressionSnapshot } from '@/lib/progression'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const progression = await getProgressionSnapshot(user.id)
  return NextResponse.json({ progression })
}

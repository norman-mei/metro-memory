import { NextResponse } from 'next/server'

import { isAutomationAdminAuthenticated } from '@/lib/adminAuth'
import { listAutomationAgentSessions } from '@/lib/automationRunRequests'

function parseLimit(searchParams: URLSearchParams) {
  const raw = Number(searchParams.get('limit') || 6)
  if (!Number.isFinite(raw)) return 6
  return Math.max(1, Math.min(20, Math.trunc(raw)))
}

export async function GET(request: Request) {
  if (!(await isAutomationAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const sessions = await listAutomationAgentSessions(parseLimit(url.searchParams))
  return NextResponse.json({ ok: true, sessions })
}

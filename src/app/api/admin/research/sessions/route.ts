import { NextResponse } from 'next/server'

import { getAutomationReviewerLabel, isAutomationAdminAuthenticated } from '@/lib/adminAuth'
import { createSession, listSessions } from '@/lib/research/sessions'

export async function GET(req: Request) {
  if (!(await isAutomationAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const reviewer = await getAutomationReviewerLabel()
  const archived = new URL(req.url).searchParams.get('archived') === '1'
  const sessions = await listSessions(reviewer, { archived })
  return NextResponse.json({ sessions })
}

export async function POST() {
  if (!(await isAutomationAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const reviewer = await getAutomationReviewerLabel()
  const session = await createSession(reviewer)
  return NextResponse.json({ session })
}

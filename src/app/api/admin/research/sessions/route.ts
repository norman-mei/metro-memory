import { NextResponse } from 'next/server'

import { getAutomationReviewerLabel, isAutomationAdminAuthenticated } from '@/lib/adminAuth'
import { createSession, listSessions } from '@/lib/research/sessions'

export async function GET() {
  if (!(await isAutomationAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const reviewer = await getAutomationReviewerLabel()
  const sessions = await listSessions(reviewer)
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

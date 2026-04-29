import { NextResponse } from 'next/server'

import { isAutomationAdminAuthenticated } from '@/lib/adminAuth'
import { queueAutomationRunRequest } from '@/lib/automationRunRequests'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ requestId: string }> },
) {
  if (!(await isAutomationAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { requestId } = await params
  if (!requestId) {
    return NextResponse.json({ error: 'Missing run request id.' }, { status: 400 })
  }

  const request = await queueAutomationRunRequest(requestId).catch((error) => {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to queue request.' },
      { status: 400 },
    )
  })

  if (request instanceof NextResponse) {
    return request
  }

  return NextResponse.json({
    ok: true,
    requestId: request.id,
    status: request.status,
  })
}

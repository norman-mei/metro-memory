import { NextResponse } from 'next/server'

import {
  getAutomationAdminUser,
  isAutomationAdminConfigured,
} from '@/lib/adminAuth'

export async function POST(request: Request) {
  if (!isAutomationAdminConfigured()) {
    return NextResponse.json(
      { error: 'Automation admin allowlist is not configured.' },
      { status: 503 },
    )
  }

  const user = await getAutomationAdminUser()
  if (!user) {
    return NextResponse.json(
      {
        error:
          'Sign in to an approved Metro Memory account before opening the automation admin panel.',
      },
      { status: 403 },
    )
  }

  return NextResponse.redirect(new URL('/admin/automation', request.url))
}

import { NextResponse } from 'next/server'

import { clearAutomationAdminSession } from '@/lib/adminAuth'

export async function POST(request: Request) {
  await clearAutomationAdminSession()
  return NextResponse.redirect(new URL('/admin/research/login', request.url))
}

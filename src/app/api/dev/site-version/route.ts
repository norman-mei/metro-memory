import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ version: 'production', enabled: false })
  }

  const { getSiteVersion } = await import('./version-dev')
  const version = await getSiteVersion()

  return NextResponse.json(
    { version, enabled: true },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    },
  )
}
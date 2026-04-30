import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({
      version: 'production',
      sourceVersion: 'production',
      assetVersion: 'production',
      enabled: false,
    })
  }

  const { getSiteVersion } = await import('./version-dev')
  const versionInfo = await getSiteVersion()

  return NextResponse.json(
    { ...versionInfo, enabled: true },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    },
  )
}

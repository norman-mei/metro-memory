import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export function GET(request: Request) {
  const country = request.headers.get('x-vercel-ip-country')?.toUpperCase() ?? ''
  const mode = country === 'CN' ? 'china-safe' : 'default'

  return NextResponse.json(
    { mode, country: country || null },
    {
      headers: {
        'Cache-Control': 'no-store',
        Vary: 'X-Vercel-IP-Country',
      },
    },
  )
}

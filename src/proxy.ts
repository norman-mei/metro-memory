import { NextRequest, NextResponse } from 'next/server'

const DEFAULT_MOBILE_ORIGINS = [
  'capacitor://localhost',
  'ionic://localhost',
  'http://localhost',
  'https://localhost',
]

const getAllowedOrigins = () =>
  new Set([
    ...DEFAULT_MOBILE_ORIGINS,
    ...(process.env.MOBILE_APP_ORIGINS ?? '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  ])

const buildCorsHeaders = (request: NextRequest) => {
  const origin = request.headers.get('origin') ?? ''
  if (!origin || !getAllowedOrigins().has(origin)) {
    return null
  }

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers':
      request.headers.get('access-control-request-headers') ??
      'Content-Type, Authorization',
    Vary: 'Origin',
  }
}

export function proxy(request: NextRequest) {
  const corsHeaders = buildCorsHeaders(request)
  if (!corsHeaders) {
    return NextResponse.next()
  }

  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 204,
      headers: corsHeaders,
    })
  }

  const response = NextResponse.next()
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value)
  })
  return response
}

export const config = {
  matcher: ['/api/:path*'],
}

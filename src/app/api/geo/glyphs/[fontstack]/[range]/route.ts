import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ fontstack: string; range: string }> },
) {
  const { fontstack, range } = await params
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN

  if (!token) {
    return new NextResponse('Mapbox token not configured', { status: 500 })
  }

  // The range parameter might contain '.pbf' at the end. We need to preserve it.
  const mapboxUrl = `https://api.mapbox.com/fonts/v1/mapbox/${encodeURIComponent(
    decodeURIComponent(fontstack),
  )}/${encodeURIComponent(decodeURIComponent(range))}?access_token=${token}`

  try {
    const response = await fetch(mapboxUrl, {
      // Don't cache on the edge, let Vercel cache it or just pass through
      next: { revalidate: 86400 }, // Cache for 24 hours
    })

    if (!response.ok) {
      return new NextResponse(`Mapbox returned ${response.status}`, {
        status: response.status,
      })
    }

    const buffer = await response.arrayBuffer()
    const headers = new Headers(response.headers)
    
    // Set permissive CORS and cache control
    headers.set('Access-Control-Allow-Origin', '*')
    headers.set('Cache-Control', 'public, max-age=31536000, immutable')

    return new NextResponse(buffer, {
      status: 200,
      headers,
    })
  } catch (error) {
    console.error('Failed to proxy glyphs:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

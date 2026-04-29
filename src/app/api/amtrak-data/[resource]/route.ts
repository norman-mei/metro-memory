import { promises as fs } from 'fs'
import { NextRequest, NextResponse } from 'next/server'
import path from 'path'

type RouteParams = {
  params: Promise<{
    resource: string
  }>
}

const AMTRAK_DATA_ROOT = path.join(
  process.cwd(),
  'public',
  'city-data',
)

const RESOURCE_FILE_MAP: Record<string, string> = {
  routes: 'amtrak.json',
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { resource } = await params
  const resourceFile = RESOURCE_FILE_MAP[resource]

  if (!resourceFile) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const filePath = path.join(AMTRAK_DATA_ROOT, resourceFile)

  try {
    const raw = await fs.readFile(filePath, 'utf8')
    const payload = JSON.parse(raw) as { routes?: unknown }
    return NextResponse.json(payload.routes ?? { type: 'FeatureCollection', features: [] }, {
      headers: {
        'Cache-Control': 'public, max-age=0, s-maxage=86400, stale-while-revalidate=86400',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}

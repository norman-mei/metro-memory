import { promises as fs } from 'fs'
import { NextRequest, NextResponse } from 'next/server'
import path from 'path'

type RouteParams = {
  params: Promise<{
    network: string
    resource: string
  }>
}

const NY_DATA_ROOT = path.join(
  process.cwd(),
  'public',
  'city-data',
)

const RESOURCE_FILE_MAP: Record<string, string> = {
  features: 'features.json',
  routes: 'routes.json',
}

const NETWORK_DIR_MAP: Record<string, string[]> = {
  rapid: ['nyc.json'],
  'regional-rail': ['nyc.json'],
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { network, resource } = await params

  const networkDir = NETWORK_DIR_MAP[network]
  const resourceFile = RESOURCE_FILE_MAP[resource]

  if (!networkDir || !resourceFile) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const filePath = path.join(NY_DATA_ROOT, ...networkDir)

  try {
    const raw = await fs.readFile(filePath, 'utf8')
    const payload = JSON.parse(raw) as Record<string, unknown>
    const resourcePayload = payload[resource]
    return NextResponse.json(resourcePayload ?? { type: 'FeatureCollection', features: [] }, {
      headers: {
        'Cache-Control': 'no-store',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}

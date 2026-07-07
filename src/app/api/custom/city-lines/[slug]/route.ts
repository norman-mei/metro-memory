import path from 'path'
import { readFile } from 'fs/promises'

import { NextResponse } from 'next/server'

import { AVAILABLE_CITY_SLUGS } from '@/lib/availableCityData'
import { deriveCityLines } from '@/lib/customWorldMap'
import type { DataFeatureCollection, RoutesFeatureCollection } from '@/lib/types'

type RouteParams = {
  params: Promise<{ slug: string }>
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { slug } = await params
  if (!AVAILABLE_CITY_SLUGS.has(slug)) {
    return NextResponse.json({ error: 'Unknown city.' }, { status: 404 })
  }

  let payload: { features: DataFeatureCollection; routes: RoutesFeatureCollection }
  try {
    const filePath = path.join(process.cwd(), 'public', 'city-data', `${slug}.json`)
    payload = JSON.parse(await readFile(filePath, 'utf8'))
  } catch {
    return NextResponse.json({ error: 'City data unavailable.' }, { status: 404 })
  }

  const lines = Array.from(deriveCityLines(payload).entries())
    .map(([id, meta]) => ({ id, name: meta.name, color: meta.color, order: meta.order }))
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))

  return NextResponse.json({ slug, lines })
}

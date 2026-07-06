// Loads a city's CURRENT stations + lines from the project's data files so the
// agent knows what already exists (and won't re-report it or hallucinate gaps).

import fs from 'fs'
import path from 'path'

import { CITY_PATH_MAP } from '@/lib/cityPathMap'

export type CityGrounding = {
  exists: boolean
  stations: string[]
  lines: string[]
}

const MAX_NAMES = 500

function readJson(file: string): any | null {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch {
    return null
  }
}

/**
 * Reads src/app/(game)/<path>/data/{features,lines}.json for the slug and returns
 * the current station + line names. `exists: false` means the city isn't in the
 * project yet (a genuine new-city candidate).
 */
export function loadCityGrounding(citySlug: string): CityGrounding {
  const rel = CITY_PATH_MAP[citySlug]
  if (!rel) return { exists: false, stations: [], lines: [] }

  const dir = path.join(process.cwd(), 'src', 'app', '(game)', rel, 'data')

  const features = readJson(path.join(dir, 'features.json'))
  const featuresArr: any[] = Array.isArray(features) ? features : (features?.features ?? [])
  const stations: string[] = []
  for (const f of featuresArr) {
    const name = f?.properties?.name
    if (typeof name === 'string' && name.trim()) stations.push(name.trim())
  }

  const linesData = readJson(path.join(dir, 'lines.json'))
  const lines: string[] = []
  if (linesData && typeof linesData === 'object') {
    for (const value of Object.values(linesData)) {
      const name = (value as any)?.name
      if (typeof name === 'string' && name.trim()) lines.push(name.trim())
    }
  }

  return { exists: true, stations: stations.slice(0, MAX_NAMES), lines: lines.slice(0, MAX_NAMES) }
}

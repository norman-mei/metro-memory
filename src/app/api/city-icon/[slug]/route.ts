import { NextResponse } from 'next/server'
import path from 'path'
import { promises as fs } from 'fs'

const VALID_SLUG = /^[a-z0-9-]+$/
const GAME_ROOT = path.join(process.cwd(), 'src', 'app', '(game)')
const FALLBACK_CANDIDATES = [
  path.join(process.cwd(), 'src', 'app', 'favicon.ico'),
  path.join(process.cwd(), 'public', 'favicon.ico'),
]

let fallbackCache: Buffer | null = null

async function readIconFromDisk(filePath: string) {
  try {
    return await fs.readFile(filePath)
  } catch {
    return null
  }
}

async function getFallbackIcon() {
  if (fallbackCache) {
    return fallbackCache
  }
  for (const candidate of FALLBACK_CANDIDATES) {
    const buffer = await readIconFromDisk(candidate)
    if (buffer) {
      fallbackCache = buffer
      return buffer
    }
  }
  fallbackCache = Buffer.alloc(0)
  return fallbackCache
}

export async function GET(
  _request: Request,
  { params }: { params: { slug?: string } },
) {
  const slug = params.slug?.toLowerCase()
  if (!slug || !VALID_SLUG.test(slug)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const iconPath = path.join(GAME_ROOT, slug, 'icon.ico')
  const iconBuffer =
    (await readIconFromDisk(iconPath)) ?? (await getFallbackIcon())

  if (!iconBuffer || iconBuffer.length === 0) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return new NextResponse(iconBuffer, {
    headers: {
      'Content-Type': 'image/x-icon',
      'Cache-Control': 'public, max-age=604800, immutable',
    },
  })
}

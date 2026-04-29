import { promises as fs } from 'fs'
import path from 'path'
import { NextResponse } from 'next/server'

const CONTENT_TYPE_BY_EXT: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.eot': 'application/vnd.ms-fontobject',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mp3': 'audio/mpeg',
  '.otf': 'font/otf',
  '.pcf': 'application/octet-stream',
  '.png': 'image/png',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.webp': 'image/webp',
}

const normalizeAssetPath = (parts: string[]) => {
  const decoded = parts.map((part) => decodeURIComponent(part))
  if (
    decoded.some(
      (part) =>
        part.length === 0 ||
        part === '.' ||
        part === '..' ||
        part.includes('/') ||
        part.includes('\\') ||
        part.includes('\0'),
    )
  ) {
    return null
  }
  return decoded
}

export const serveToolPublicAsset = async (toolRoot: string, assetParts: string[]) => {
  const safeParts = normalizeAssetPath(assetParts)

  if (!safeParts || safeParts.length === 0) {
    return new NextResponse('Not found', { status: 404 })
  }

  const toolRootResolved = path.resolve(toolRoot)
  // Construct the path from validated segments to avoid broad dynamic path patterns.
  const absolutePath = [toolRootResolved, ...safeParts].join(path.sep)
  const relativeToRoot = path.relative(toolRootResolved, absolutePath)

  if (
    relativeToRoot.length === 0 ||
    relativeToRoot.startsWith('..') ||
    path.isAbsolute(relativeToRoot)
  ) {
    return new NextResponse('Forbidden', { status: 403 })
  }

  try {
    const fileBuffer = await fs.readFile(absolutePath)
    const ext = path.extname(absolutePath).toLowerCase()
    const contentType = CONTENT_TYPE_BY_EXT[ext] ?? 'application/octet-stream'

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=300',
      },
    })
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return new NextResponse('Not found', { status: 404 })
    }
    throw error
  }
}

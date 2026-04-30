import fs from 'fs/promises'
import path from 'path'

const CACHE_TTL_MS = 1000
const WATCH_TARGETS = ['src', 'public']
const IMAGE_FILE_RE = /\.(avif|bmp|gif|ico|jpe?g|png|svg|webp)$/i

let cachedVersion = { sourceVersion: '0', assetVersion: '0', version: '0' }
let cachedAt = 0

async function getLatestModifiedTimes(
  targetPath: string,
): Promise<{ sourceLatest: number; assetLatest: number }> {
  try {
    const stat = await fs.stat(targetPath)
    const initial = { sourceLatest: 0, assetLatest: 0 }

    if (!stat.isDirectory()) {
      if (IMAGE_FILE_RE.test(targetPath)) {
        return { ...initial, assetLatest: stat.mtimeMs }
      }
      return { ...initial, sourceLatest: stat.mtimeMs }
    }

    let latest = initial
    const entries = await fs.readdir(targetPath, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.name === '.git' || entry.name === '.next' || entry.name === 'node_modules' || entry.name === 'scripts') {
        continue
      }

      const childLatest = await getLatestModifiedTimes(path.join(targetPath, entry.name))
      latest = {
        sourceLatest: Math.max(latest.sourceLatest, childLatest.sourceLatest),
        assetLatest: Math.max(latest.assetLatest, childLatest.assetLatest),
      }
    }

    return latest
  } catch {
    return { sourceLatest: 0, assetLatest: 0 }
  }
}

export async function getSiteVersion() {
  const now = Date.now()
  if (now - cachedAt < CACHE_TTL_MS) {
    return cachedVersion
  }

  const absoluteTargets = WATCH_TARGETS.map((target) => path.join(process.cwd(), target))
  const modifiedTimes = await Promise.all(
    absoluteTargets.map((target) => getLatestModifiedTimes(target)),
  )
  const sourceVersion = String(
    Math.floor(Math.max(...modifiedTimes.map((entry) => entry.sourceLatest), 0)),
  )
  const assetVersion = String(
    Math.floor(Math.max(...modifiedTimes.map((entry) => entry.assetLatest), 0)),
  )

  cachedVersion = {
    sourceVersion,
    assetVersion,
    version: `${sourceVersion}:${assetVersion}`,
  }
  cachedAt = now

  return cachedVersion
}

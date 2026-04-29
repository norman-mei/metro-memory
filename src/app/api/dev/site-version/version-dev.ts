import fs from 'fs/promises'
import path from 'path'

const CACHE_TTL_MS = 1000
const WATCH_TARGETS = [
  'src/app',
  'src/components',
  'src/context',
  'src/lib',
  'src/styles',
  'public/images',
  'public/city-data',
  'public/city-cards',
  'public/city-icons',
]

let cachedVersion = '0'
let cachedAt = 0

async function getLatestModifiedTime(targetPath: string): Promise<number> {
  try {
    const stat = await fs.stat(targetPath)
    let latest = stat.mtimeMs

    if (!stat.isDirectory()) {
      return latest
    }

    const entries = await fs.readdir(targetPath, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.name === '.git' || entry.name === '.next' || entry.name === 'node_modules') {
        continue
      }

      const childLatest = await getLatestModifiedTime(path.join(targetPath, entry.name))
      if (childLatest > latest) {
        latest = childLatest
      }
    }

    return latest
  } catch {
    return 0
  }
}

export async function getSiteVersion() {
  const now = Date.now()
  if (now - cachedAt < CACHE_TTL_MS) {
    return cachedVersion
  }

  const absoluteTargets = WATCH_TARGETS.map((target) => path.join(process.cwd(), target))
  const modifiedTimes = await Promise.all(absoluteTargets.map((target) => getLatestModifiedTime(target)))
  const latest = Math.max(...modifiedTimes, 0)

  cachedVersion = String(Math.floor(latest))
  cachedAt = now

  return cachedVersion
}
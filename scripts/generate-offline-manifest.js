const fs = require('fs/promises')
const path = require('path')

const ROOTS = [
  { dir: path.join(process.cwd(), 'public', 'city-data'), prefix: '/city-data/' },
  { dir: path.join(process.cwd(), 'public', 'city-icons'), prefix: '/city-icons/' },
  { dir: path.join(process.cwd(), 'public', 'city-cards'), prefix: '/city-cards/' },
  { dir: path.join(process.cwd(), 'public', 'images'), prefix: '/images/' },
]

async function listFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await listFiles(fullPath)))
    } else {
      files.push(fullPath)
    }
  }
  return files
}

async function main() {
  const assets = ['/']
  const cityAssets = {}

  for (const root of ROOTS) {
    try {
      const files = await listFiles(root.dir)
      for (const file of files) {
        const rel = path.relative(root.dir, file).split(path.sep).join('/')
        const assetPath = `${root.prefix}${rel}`
        assets.push(assetPath)
        const baseName = path.basename(file, path.extname(file))
        if (root.prefix === '/city-data/' || root.prefix === '/city-icons/') {
          cityAssets[baseName] = cityAssets[baseName] || []
          cityAssets[baseName].push(assetPath)
        }
        if (root.prefix === '/images/' || root.prefix === '/city-cards/') {
          const segments = rel.split('/')
          const maybeSlug = path.basename(segments[segments.length - 1], path.extname(file))
          if (maybeSlug && maybeSlug !== '_default') {
            cityAssets[maybeSlug] = cityAssets[maybeSlug] || []
            cityAssets[maybeSlug].push(assetPath)
          }
        }
      }
    } catch (error) {
      console.warn(`offline manifest: skipped ${root.dir}`, error)
    }
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    assets,
    cityAssets,
  }

  const target = path.join(process.cwd(), 'public', 'offline-manifest.json')
  await fs.writeFile(target, JSON.stringify(manifest, null, 2))
  console.log(`offline manifest wrote ${assets.length} assets to ${target}`)
}

main().catch((error) => {
  console.error('Failed to build offline manifest', error)
  process.exitCode = 1
})

const path = require('path')
const fs = require('fs/promises')
const fg = require('fast-glob')

const SOURCE_ROOT = path.join(process.cwd(), 'src', 'app', '(game)')
const DEST_ROOT = path.join(process.cwd(), 'public', 'city-data')
const SPLIT_RESOURCE_EXPORT_SLUGS = new Set(['nyc'])
const MINI_CITY_REGISTRY_PATH = path.join(
  process.cwd(),
  'src',
  'lib',
  'miniCitiesRegistry.json',
)

async function ensureDestDir() {
  await fs.mkdir(DEST_ROOT, { recursive: true })
}

function getSlugFromMatch(relPath) {
  // relPath looks like "north-america/usa/city-slug/data/routes.json"
  const segments = relPath.split('/')
  return segments[segments.length - 3]
}

async function buildCityPayload(baseDir) {
  const featuresPath = path.join(baseDir, 'features.json')
  const routesPath = path.join(baseDir, 'routes.json')

  const [featuresRaw, routesRaw] = await Promise.all([
    fs.readFile(featuresPath, 'utf-8'),
    fs.readFile(routesPath, 'utf-8'),
  ])

  return {
    features: JSON.parse(featuresRaw),
    routes: JSON.parse(routesRaw),
  }
}

function normalizeNycSirExpressGeometry(payload) {
  const routes = Array.isArray(payload?.routes?.features)
    ? payload.routes.features
    : null

  if (!routes) {
    return payload
  }

  const local = routes.filter(
    (feature) => feature?.properties?.line === 'NewYorkSubwaySI',
  )
  const express = routes.filter(
    (feature) => feature?.properties?.line === 'NewYorkSubwaySIExpress',
  )

  if (local.length === 0 || local.length !== express.length) {
    return payload
  }

  for (let index = 0; index < express.length; index += 1) {
    express[index].geometry = JSON.parse(JSON.stringify(local[index].geometry))
  }

  return payload
}

async function writePayloadFiles(slug, payload) {
  const combinedPath = path.join(DEST_ROOT, `${slug}.json`)
  await fs.writeFile(combinedPath, JSON.stringify(payload))

  let written = 1

  if (SPLIT_RESOURCE_EXPORT_SLUGS.has(slug)) {
    await Promise.all([
      fs.writeFile(
        path.join(DEST_ROOT, `${slug}-features.json`),
        JSON.stringify(payload.features),
      ),
      fs.writeFile(
        path.join(DEST_ROOT, `${slug}-routes.json`),
        JSON.stringify(payload.routes),
      ),
    ])
    written += 2
  }

  return written
}

async function buildParentPayloadFromRegistryPath(parentPath) {
  const primaryDir = path.join(SOURCE_ROOT, parentPath, 'data')
  const fullDir = path.join(primaryDir, 'full')

  try {
    return await buildCityPayload(primaryDir)
  } catch (primaryError) {
    return buildCityPayload(fullDir)
  }
}

function filterPayloadByLines(payload, includeLines) {
  const lineSet = new Set(includeLines)
  return {
    features: {
      ...payload.features,
      features: payload.features.features.filter((feature) =>
        lineSet.has(feature?.properties?.line),
      ),
    },
    routes: {
      ...payload.routes,
      features: payload.routes.features.filter((feature) =>
        lineSet.has(feature?.properties?.line),
      ),
    },
  }
}

async function main() {
  await ensureDestDir()

  const matches = await fg('**/data/routes.json', {
    cwd: SOURCE_ROOT,
    dot: false,
  })

  let written = 0
  const payloadsBySlug = new Map()

  for (const relPath of matches) {
    if (relPath.includes('_placeholder')) continue

    const slug = getSlugFromMatch(relPath)
    const cityDataDir = path.join(SOURCE_ROOT, path.dirname(relPath))

    try {
      const payload = await buildCityPayload(cityDataDir)
      if (slug === 'nyc') {
        normalizeNycSirExpressGeometry(payload)
      }
      payloadsBySlug.set(slug, payload)
      written += await writePayloadFiles(slug, payload)
    } catch (err) {
      console.warn(`Skipping ${slug}: ${err.message}`)
    }
  }

  try {
    const registryRaw = await fs.readFile(MINI_CITY_REGISTRY_PATH, 'utf-8')
    const registry = JSON.parse(registryRaw)
    const parents = Array.isArray(registry?.parents) ? registry.parents : []

    for (const parent of parents) {
      const parentSlug = parent?.parentSlug
      const children = Array.isArray(parent?.children) ? parent.children : []
      if (!parentSlug || children.length === 0) {
        continue
      }

      const parentPayload =
        payloadsBySlug.get(parentSlug) ??
        (parent?.parentPath
          ? await buildParentPayloadFromRegistryPath(parent.parentPath).catch(() => null)
          : null)
      if (!parentPayload) {
        console.warn(`Skipping mini cities for ${parentSlug}: missing parent payload`)
        continue
      }

      if (!payloadsBySlug.has(parentSlug)) {
        payloadsBySlug.set(parentSlug, parentPayload)
        written += await writePayloadFiles(parentSlug, parentPayload)
      }

      for (const child of children) {
        const childSlug = child?.slug
        const includeLines = Array.isArray(child?.includeLines)
          ? child.includeLines
          : []
        if (!childSlug || includeLines.length === 0) {
          continue
        }

        const payload = filterPayloadByLines(parentPayload, includeLines)
        const destPath = path.join(DEST_ROOT, `${childSlug}.json`)
        await fs.writeFile(destPath, JSON.stringify(payload))
        written++
      }
    }
  } catch (err) {
    console.warn(`Skipping mini-city export: ${err.message}`)
  }

  console.log(`Exported ${written} city data files to ${DEST_ROOT}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

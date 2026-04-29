import fs from 'fs'
import path from 'path'

import { PrismaClient } from '@prisma/client'

const ROOT = process.cwd()
const REGISTRY_DIR = path.join(ROOT, 'city-registry')

type SourceKey = 'gtfsFeeds' | 'officialPages' | 'pressPages' | 'mapPdfs'

type ParsedSourceSuggestion = {
  city: string
  sourceKey: SourceKey
  url: string
}

type RegistryJson = {
  city: string
  sources?: Partial<Record<SourceKey, string[]>>
  [key: string]: unknown
}

const parseSuggestionsFromReport = (reportMarkdown: string | null | undefined) => {
  if (!reportMarkdown) return [] as ParsedSourceSuggestion[]

  const suggestions: ParsedSourceSuggestion[] = []
  let currentCity = ''

  reportMarkdown.split('\n').forEach((line) => {
    if (line.startsWith('## ')) {
      currentCity = line.replace(/^##\s+/, '').trim()
      return
    }
    if (!line.startsWith('- Source enrichment: ') || !currentCity) {
      return
    }

    line
      .replace('- Source enrichment: ', '')
      .split(' | ')
      .forEach((entry) => {
        const [sourceKey, url] = entry.split(' -> ')
        if (!sourceKey || !url) return
        if (
          sourceKey !== 'gtfsFeeds' &&
          sourceKey !== 'officialPages' &&
          sourceKey !== 'pressPages' &&
          sourceKey !== 'mapPdfs'
        ) {
          return
        }

        suggestions.push({
          city: currentCity,
          sourceKey,
          url: url.trim(),
        })
      })
  })

  return suggestions
}

const getRegistryPath = (city: string) => path.join(REGISTRY_DIR, `${city}.json`)

const loadRegistry = (city: string) => {
  const filePath = getRegistryPath(city)
  if (!fs.existsSync(filePath)) return null
  return {
    filePath,
    json: JSON.parse(fs.readFileSync(filePath, 'utf8')) as RegistryJson,
  }
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required to backfill source hints from automation runs.')
  }

  const apply = process.argv.includes('--apply')
  const prisma = new PrismaClient()

  try {
    const runs = await prisma.automationRun.findMany({
      where: {
        source: 'metro-sync',
        reportMarkdown: { not: null },
      },
      select: {
        reportMarkdown: true,
        startedAt: true,
      },
      orderBy: { startedAt: 'desc' },
      take: 24,
    })

    const suggestionsByCity = new Map<string, Map<SourceKey, string[]>>()
    runs.forEach((run) => {
      parseSuggestionsFromReport(run.reportMarkdown).forEach((suggestion) => {
        const cityBucket = suggestionsByCity.get(suggestion.city) || new Map<SourceKey, string[]>()
        const keyBucket = cityBucket.get(suggestion.sourceKey) || []
        if (!keyBucket.includes(suggestion.url)) {
          keyBucket.push(suggestion.url)
        }
        cityBucket.set(suggestion.sourceKey, keyBucket)
        suggestionsByCity.set(suggestion.city, cityBucket)
      })
    })

    let updatedFiles = 0
    let addedUrls = 0

    Array.from(suggestionsByCity.entries())
      .sort((left, right) => left[0].localeCompare(right[0]))
      .forEach(([city, citySuggestions]) => {
        const registry = loadRegistry(city)
        if (!registry) return

        const nextJson: RegistryJson = {
          ...registry.json,
          sources: {
            ...(registry.json.sources || {}),
          },
        }

        let cityChanged = false
        for (const [sourceKey, urls] of citySuggestions.entries()) {
          const existing = Array.isArray(nextJson.sources?.[sourceKey])
            ? [...(nextJson.sources?.[sourceKey] || [])]
            : []

          urls.forEach((url) => {
            if (!existing.includes(url)) {
              existing.push(url)
              addedUrls += 1
              cityChanged = true
            }
          })

          if (existing.length > 0) {
            nextJson.sources![sourceKey] = existing
          }
        }

        if (!cityChanged) return

        updatedFiles += 1
        if (apply) {
          fs.writeFileSync(registry.filePath, `${JSON.stringify(nextJson, null, 2)}\n`)
        }
      })

    process.stdout.write(
      `${apply ? 'Applied' : 'Prepared'} source-hint backfill for ${updatedFiles} registries, ${addedUrls} URLs.\n`,
    )
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  process.stderr.write(`${message}\n`)
  process.exit(1)
})

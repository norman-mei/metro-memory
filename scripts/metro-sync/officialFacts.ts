import fs from 'fs'
import path from 'path'
import * as cheerio from 'cheerio'
import JSZip from 'jszip'
import { extractGroundedFactsFromArtifact } from '../../src/lib/automationAgentModel.ts'

import { buildEvidenceCitation, appendCitationMetadata } from './provenance.ts'
import type { CollectedArtifact, ExtractedArtifactFact } from './types.ts'

const ROOT = process.cwd()
const OCR_MIN_TEXT_LENGTH = 40
const validatedOcrLanguageDataPaths = new Set<string>()

const COLOR_NAME_TO_HEX: Record<string, string> = {
  red: '#E53935',
  blue: '#1E88E5',
  green: '#43A047',
  yellow: '#FDD835',
  orange: '#FB8C00',
  purple: '#8E24AA',
  violet: '#8E24AA',
  pink: '#D81B60',
  brown: '#8D6E63',
  silver: '#9E9E9E',
  gold: '#D4AF37',
  grey: '#757575',
  gray: '#757575',
  black: '#111111',
  white: '#FFFFFF',
  cyan: '#00ACC1',
  teal: '#00897B',
  magenta: '#C2185B',
}

const normalize = (value: string | undefined | null) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '')

const normalizeHexColor = (value: string | undefined | null) => {
  const color = String(value || '').trim()
  if (!color) return null
  if (/^#[0-9a-fA-F]{6}$/.test(color)) return color.toUpperCase()
  if (/^[0-9a-fA-F]{6}$/.test(color)) return `#${color.toUpperCase()}`
  return COLOR_NAME_TO_HEX[color.toLowerCase()] || null
}

const readArtifactBuffer = (artifact: CollectedArtifact) => {
  if (!artifact.localPath) return null
  const absolutePath = path.join(ROOT, artifact.localPath)
  if (!fs.existsSync(absolutePath)) return null
  try {
    return fs.readFileSync(absolutePath)
  } catch {
    return null
  }
}

const validateLocalOcrLanguageData = (lang: string, langPath: string | undefined) => {
  if (!langPath) return

  const resolvedLangPath = path.resolve(ROOT, langPath)
  const trainedDataPath = path.join(resolvedLangPath, `${lang}.traineddata.gz`)

  if (validatedOcrLanguageDataPaths.has(trainedDataPath)) return
  if (!fs.existsSync(trainedDataPath)) {
    throw new Error(
      `OCR is enabled but METRO_SYNC_OCR_LANG_PATH is set to "${langPath}" and the traineddata file is missing at "${trainedDataPath}".`,
    )
  }

  validatedOcrLanguageDataPaths.add(trainedDataPath)
}

const extractPdfText = async (buffer: Buffer) => {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: true,
  })
  const document = await loadingTask.promise
  const pageTexts: string[] = []

  const pageLimit = Math.min(document.numPages, 8)
  for (let pageNumber = 1; pageNumber <= pageLimit; pageNumber += 1) {
    const page = await document.getPage(pageNumber)
    const textContent = await page.getTextContent()
    const text = textContent.items
      .map((item: any) => (typeof item?.str === 'string' ? item.str : ''))
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()
    if (text) {
      pageTexts.push(text)
    }
  }

  await document.destroy()
  return pageTexts.join(' ').slice(0, 4000)
}

const renderPdfPagesForOcr = async (buffer: Buffer) => {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const canvasRuntime = await import('@napi-rs/canvas')

  ;(globalThis as any).DOMMatrix = canvasRuntime.DOMMatrix
  ;(globalThis as any).ImageData = canvasRuntime.ImageData
  ;(globalThis as any).Path2D = canvasRuntime.Path2D

  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: true,
  })
  const document = await loadingTask.promise
  const pageImages: Buffer[] = []

  try {
    const pageLimit = Math.min(document.numPages, Number(process.env.METRO_SYNC_OCR_PDF_PAGE_LIMIT || 2))
    for (let pageNumber = 1; pageNumber <= pageLimit; pageNumber += 1) {
      const page = await document.getPage(pageNumber)
      const viewport = page.getViewport({
        scale: Number(process.env.METRO_SYNC_OCR_PDF_SCALE || 2.2),
      })
      const canvas = canvasRuntime.createCanvas(
        Math.ceil(viewport.width),
        Math.ceil(viewport.height),
      )
      const context = canvas.getContext('2d')
      await page.render({
        canvasContext: context as any,
        viewport,
      }).promise
      pageImages.push(canvas.toBuffer('image/png'))
    }
  } finally {
    await document.destroy()
  }

  return pageImages
}

const extractPdfOcrText = async (buffer: Buffer) => {
  const pageImages = await renderPdfPagesForOcr(buffer)
  if (pageImages.length === 0) return ''

  const tesseractModule = await import('tesseract.js')
  const Tesseract = (tesseractModule as any).default || tesseractModule
  const lang = process.env.METRO_SYNC_OCR_LANG || 'eng'
  const langPath = process.env.METRO_SYNC_OCR_LANG_PATH || undefined
  const cachePath =
    process.env.METRO_SYNC_OCR_CACHE_PATH || path.join(ROOT, '.cache', 'tesseract')

  validateLocalOcrLanguageData(lang, langPath)

  const textChunks: string[] = []
  for (const image of pageImages) {
    const result = await Tesseract.recognize(image, lang, {
      logger: () => {},
      ...(langPath ? { langPath } : {}),
      cachePath,
    })
    const text = String(result?.data?.text || '')
      .replace(/\s+/g, ' ')
      .trim()
    if (text) {
      textChunks.push(text)
    }
  }

  return textChunks.join(' ').slice(0, 4000)
}

const readArtifactText = async (artifact: CollectedArtifact) => {
  const metadata = artifact.metadataJson && typeof artifact.metadataJson === 'object'
    ? artifact.metadataJson
    : {}
  const title = typeof metadata.title === 'string' ? metadata.title : ''
  const headline = typeof metadata.headline === 'string' ? metadata.headline : ''
  const snippet = typeof metadata.snippet === 'string' ? metadata.snippet : ''
  const filename = artifact.localPath ? path.basename(artifact.localPath) : ''
  const url = artifact.sourceUrl || ''

  let bodyExcerpt = ''
  const rawBuffer = readArtifactBuffer(artifact)
  if (rawBuffer) {
    try {
      if (artifact.mimeType?.includes('pdf')) {
        bodyExcerpt = await extractPdfText(rawBuffer)
        const ocrEnabled = String(process.env.METRO_SYNC_ENABLE_PDF_OCR || '').trim() === '1'
        if (ocrEnabled && bodyExcerpt.replace(/\s+/g, '').length < OCR_MIN_TEXT_LENGTH) {
          try {
            const ocrText = await extractPdfOcrText(rawBuffer)
            if (ocrText) {
              bodyExcerpt = [bodyExcerpt, ocrText].filter(Boolean).join(' ').slice(0, 4000)
            }
          } catch (error) {
            if (
              error instanceof Error &&
              error.message.includes('METRO_SYNC_OCR_LANG_PATH')
            ) {
              throw error
            }

            // OCR is best-effort; fall back to extracted PDF text only
          }
        }
      } else {
        const raw = rawBuffer.toString('utf8').slice(0, 16000)
        if (artifact.mimeType?.includes('html')) {
          const $ = cheerio.load(raw)
          bodyExcerpt = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 4000)
        } else if (
          artifact.mimeType?.includes('json') ||
          artifact.mimeType?.includes('xml') ||
          artifact.mimeType?.includes('text') ||
          artifact.mimeType?.includes('csv')
        ) {
          bodyExcerpt = raw.replace(/\s+/g, ' ').trim().slice(0, 4000)
        }
      }
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes('METRO_SYNC_OCR_LANG_PATH')
      ) {
        throw error
      }

      try {
        const raw = rawBuffer.toString('utf8').slice(0, 16000)
        const $ = cheerio.load(raw)
        bodyExcerpt = artifact.mimeType?.includes('html')
          ? $('body').text().replace(/\s+/g, ' ').trim().slice(0, 4000)
          : raw.replace(/\s+/g, ' ').trim().slice(0, 4000)
      } catch {
        // ignore unreadable artifact bodies
      }
    }
  }

  return [title, headline, snippet, filename, url, bodyExcerpt].filter(Boolean).join(' ')
}

const buildFact = (
  artifact: CollectedArtifact,
  kind: ExtractedArtifactFact['kind'],
  label: string,
  snippet: string,
  confidence: number,
  metadata: Record<string, any> = {},
): ExtractedArtifactFact => ({
  citySlug: artifact.citySlug || '',
  artifactType: artifact.artifactType,
  sourceUrl: artifact.sourceUrl,
  sourceDomain: artifact.sourceDomain,
  kind,
  label,
  snippet,
  confidence,
  metadata: appendCitationMetadata(metadata, [
    buildEvidenceCitation({
      artifact,
      excerpt: snippet,
      locatorType: artifact.mimeType?.includes('pdf') ? 'PDF_PAGE' : 'TEXT',
    }),
  ]),
})

const trimSnippet = (value: string, max = 240) => value.replace(/\s+/g, ' ').trim().slice(0, max)

const collectKnownLineMatch = (lineNames: string[], candidate: string) => {
  const normalizedCandidate = normalize(candidate)
  if (!normalizedCandidate) return null
  return (
    lineNames.find((lineName) => normalize(lineName) === normalizedCandidate) ||
    lineNames.find((lineName) => normalizedCandidate.includes(normalize(lineName))) ||
    lineNames.find((lineName) => normalize(lineName).includes(normalizedCandidate)) ||
    null
  )
}

const collectLikelyStationList = (text: string) =>
  text
    .split(/[•\n\r,;|>→/]/)
    .map((value) => value.trim())
    .filter((value) => value.length >= 3 && value.length <= 80)
    .filter((value) => /[\p{L}\p{N}]/u.test(value))
    .slice(0, 40)

const splitCsvLine = (line: string) => {
  const values: string[] = []
  let current = ''
  let inQuotes = false

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"'
        index += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }
    if (char === ',' && !inQuotes) {
      values.push(current)
      current = ''
      continue
    }
    current += char
  }

  values.push(current)
  return values.map((value) => value.trim())
}

const parseCsvText = (content: string) => {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  if (lines.length < 2) return []

  const header = splitCsvLine(lines[0])
  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line)
    return header.reduce<Record<string, string>>((acc, key, index) => {
      acc[key] = values[index] || ''
      return acc
    }, {})
  })
}

const extractGtfsFacts = async ({
  artifact,
  city,
  lineNames,
}: {
  artifact: CollectedArtifact
  city: string
  lineNames: string[]
}) => {
  const facts: ExtractedArtifactFact[] = []
  const buffer = readArtifactBuffer(artifact)
  if (!buffer) return facts

  try {
    const zip = await JSZip.loadAsync(buffer)
    const agencyFile = zip.file(/agency\.txt$/i)?.[0] || null
    const routesFile = zip.file(/routes\.txt$/i)?.[0] || null
    const stopsFile = zip.file(/stops\.txt$/i)?.[0] || null
    const tripsFile = zip.file(/trips\.txt$/i)?.[0] || null
    const stopTimesFile = zip.file(/stop_times\.txt$/i)?.[0] || null
    const shapesFile = zip.file(/shapes\.txt$/i)?.[0] || null

    facts.push(
      buildFact(
        artifact,
        'DATASET_REFERENCE',
        'GTFS feed collected',
        `Collected GTFS feed artifact for ${city}.`,
        0.92,
      ),
    )

    if (agencyFile) {
      const agencies = parseCsvText(await agencyFile.async('string')).slice(0, 5)
      agencies.forEach((agency) => {
        const agencyName = agency.agency_name?.trim()
        if (!agencyName) return
        facts.push(
          buildFact(
            artifact,
            'OPERATOR_REFERENCE',
            `GTFS agency ${agencyName}`,
            trimSnippet(`${agencyName} ${agency.agency_url || ''}`),
            0.93,
            {
              operatorName: agencyName,
              agencyId: agency.agency_id || null,
            },
          ),
        )
        facts.push(
          buildFact(
            artifact,
            'OPERATOR_METADATA_REFERENCE',
            `GTFS operator metadata ${agencyName}`,
            trimSnippet(`${agencyName} ${agency.agency_url || ''}`),
            0.91,
            {
              operatorName: agencyName,
              agencyId: agency.agency_id || null,
            },
          ),
        )
      })
    }

    const trips = tripsFile ? parseCsvText(await tripsFile.async('string')) : []
    const stopTimes = stopTimesFile ? parseCsvText(await stopTimesFile.async('string')) : []
    const shapes = shapesFile ? parseCsvText(await shapesFile.async('string')) : []
    const tripById = new Map(trips.map((trip) => [trip.trip_id, trip]))
    const routeStops = new Map<string, Set<string>>()
    stopTimes.forEach((entry) => {
      const trip = tripById.get(entry.trip_id)
      const routeId = trip?.route_id
      const stopId = entry.stop_id
      if (!routeId || !stopId) return
      const bucket = routeStops.get(routeId) || new Set<string>()
      bucket.add(stopId)
      routeStops.set(routeId, bucket)
    })
    const shapePointCounts = new Map<string, number>()
    shapes.forEach((shape) => {
      const shapeId = shape.shape_id?.trim()
      if (!shapeId) return
      shapePointCounts.set(shapeId, (shapePointCounts.get(shapeId) || 0) + 1)
    })
    const routeShapeCounts = new Map<string, number>()
    trips.forEach((trip) => {
      const routeId = trip.route_id?.trim()
      const shapeId = trip.shape_id?.trim()
      if (!routeId || !shapeId) return
      routeShapeCounts.set(
        routeId,
        Math.max(routeShapeCounts.get(routeId) || 0, shapePointCounts.get(shapeId) || 0),
      )
    })

    if (routesFile) {
      const routes = parseCsvText(await routesFile.async('string')).slice(0, 200)
      routes.forEach((route) => {
        const rawLineName =
          route.route_long_name?.trim() ||
          route.route_short_name?.trim() ||
          route.route_id?.trim() ||
          ''
        if (!rawLineName) return

        const matchedLineName = collectKnownLineMatch(lineNames, rawLineName) || rawLineName
        facts.push({
          ...buildFact(
            artifact,
            'LINE_REFERENCE',
            `GTFS route ${rawLineName}`,
            trimSnippet(
              `${rawLineName} ${route.route_desc || ''} ${route.route_short_name || ''}`,
            ),
            0.95,
            {
              gtfsRouteId: route.route_id || null,
              routeShortName: route.route_short_name || null,
              routeLongName: route.route_long_name || null,
              gtfsStopCount: routeStops.get(route.route_id || '')?.size || 0,
              gtfsShapePointCount: routeShapeCounts.get(route.route_id || '') || 0,
            },
          ),
          lineName: matchedLineName,
        })

        if (
          matchedLineName &&
          route.route_long_name?.trim() &&
          normalize(matchedLineName) !== normalize(route.route_long_name)
        ) {
          facts.push({
            ...buildFact(
              artifact,
              'LINE_RENAME_REFERENCE',
              `GTFS rename hint for ${matchedLineName}`,
              trimSnippet(
                `${matchedLineName} -> ${route.route_long_name} (${route.route_short_name || route.route_id || ''})`,
              ),
              0.88,
              {
                previousLineName: matchedLineName,
                nextLineName: route.route_long_name?.trim(),
                gtfsRouteId: route.route_id || null,
              },
            ),
            lineName: matchedLineName,
          })
        }

        const normalizedColor = normalizeHexColor(route.route_color)
        if (normalizedColor) {
          facts.push({
            ...buildFact(
              artifact,
              'LINE_COLOR_REFERENCE',
              `GTFS color for ${rawLineName}`,
              trimSnippet(`${rawLineName} ${normalizedColor}`),
              0.96,
              {
                color: normalizedColor,
                gtfsRouteId: route.route_id || null,
                gtfsStopCount: routeStops.get(route.route_id || '')?.size || 0,
              },
            ),
            lineName: matchedLineName,
          })
        }
      })
    }

    if (stopsFile) {
      const stops = parseCsvText(await stopsFile.async('string')).slice(0, 400)
      const routeNameById = new Map(
        (routesFile ? parseCsvText(await routesFile.async('string')) : [])
          .map((route) => {
            const rawLineName =
              route.route_long_name?.trim() ||
              route.route_short_name?.trim() ||
              route.route_id?.trim() ||
              ''
            return [route.route_id, collectKnownLineMatch(lineNames, rawLineName) || rawLineName] as const
          })
          .filter((entry) => entry[0] && entry[1]),
      )
      const stopRouteIds = new Map<string, Set<string>>()
      stopTimes.forEach((entry) => {
        const trip = tripById.get(entry.trip_id)
        const routeId = trip?.route_id
        if (!routeId || !entry.stop_id) return
        const bucket = stopRouteIds.get(entry.stop_id) || new Set<string>()
        bucket.add(routeId)
        stopRouteIds.set(entry.stop_id, bucket)
      })
      stops.forEach((stop) => {
        const stopName = stop.stop_name?.trim()
        if (!stopName) return
        const stopLat = Number(stop.stop_lat)
        const stopLon = Number(stop.stop_lon)
        const routeIds = Array.from(stopRouteIds.get(stop.stop_id || '') || [])
        const lineHints = routeIds
          .map((routeId) => routeNameById.get(routeId))
          .filter((value): value is string => Boolean(value))
        if (lineHints.length === 0) lineHints.push('')

        lineHints.slice(0, 3).forEach((lineHint) => {
          facts.push(
            buildFact(
              artifact,
              'STATION_REFERENCE',
              `GTFS stop ${stopName}`,
              trimSnippet(`${stopName} ${stop.stop_code || ''} ${lineHint}`),
              0.84,
              {
                stopId: stop.stop_id || null,
                stopName,
                lineName: lineHint || null,
                stopLat: Number.isFinite(stopLat) ? stopLat : null,
                stopLon: Number.isFinite(stopLon) ? stopLon : null,
                gtfsRouteIds: routeIds,
              },
            ),
          )
        })
      })
    }
  } catch {
    // ignore malformed GTFS zips
  }

  return facts
}

const collectOperatorFact = (artifact: CollectedArtifact, text: string) => {
  const patterns = [
    /\boperated by\s+([^.;,]+?)(?:\s+(?:metro|rail|transit|system|line|network)\b|[.;,]|$)/i,
    /\boperator(?:\s+is|\s*:)?\s+([^.;,]+?)(?:[.;,]|$)/i,
    /\bagency(?:\s+is|\s*:)?\s+([^.;,]+?)(?:[.;,]|$)/i,
    /\b(?:run|managed)\s+by\s+([^.;,]+?)(?:[.;,]|$)/i,
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    const operatorName = match?.[1]?.trim()
    if (!operatorName || operatorName.length < 3) continue

    return [
      buildFact(
        artifact,
        'OPERATOR_REFERENCE',
        `Official operator ${operatorName}`,
        trimSnippet(match[0]),
        artifact.artifactType === 'PRESS_RELEASE' ? 0.88 : 0.8,
        { operatorName },
      ),
      buildFact(
        artifact,
        'OPERATOR_METADATA_REFERENCE',
        `Official operator metadata ${operatorName}`,
        trimSnippet(match[0]),
        artifact.artifactType === 'PRESS_RELEASE' ? 0.86 : 0.78,
        { operatorName },
      ),
    ]
  }

  return []
}

const extractHtmlStructuredFacts = ({
  artifact,
  rawHtml,
  lineNames,
}: {
  artifact: CollectedArtifact
  rawHtml: string
  lineNames: string[]
}) => {
  const facts: ExtractedArtifactFact[] = []
  const $ = cheerio.load(rawHtml)

  $('table tr').each((_, row) => {
    const cells = $(row)
      .find('th, td')
      .map((__, cell) => $(cell).text().replace(/\s+/g, ' ').trim())
      .get()
      .filter(Boolean)
    if (cells.length < 2) return

    const joined = cells.join(' | ')
    const lineHint = cells
      .map((cell) => collectKnownLineMatch(lineNames, cell))
      .find(Boolean)
    if (lineHint) {
      facts.push({
        ...buildFact(
          artifact,
          'LINE_REFERENCE',
          `Table reference to ${lineHint}`,
          trimSnippet(joined),
          0.82,
          { lineName: lineHint, extractedFrom: 'html-table' },
        ),
        lineName: lineHint,
      })
    }

    const proposedColor = cells.map((cell) => normalizeHexColor(cell)).find(Boolean)
    if (lineHint && proposedColor) {
      facts.push({
        ...buildFact(
          artifact,
          'LINE_COLOR_REFERENCE',
          `Legend color for ${lineHint}`,
          trimSnippet(joined),
          0.88,
          { color: proposedColor, extractedFrom: 'html-table' },
        ),
        lineName: lineHint,
      })
    }

    const stationCandidates = cells.slice(1).flatMap((cell) => collectLikelyStationList(cell))
    stationCandidates.slice(0, 8).forEach((stationName) => {
      facts.push(
        buildFact(
          artifact,
          'STATION_REFERENCE',
          `Station list reference ${stationName}`,
          trimSnippet(joined),
          0.78,
          {
            stopName: stationName,
            lineName: lineHint || null,
            extractedFrom: 'html-table',
          },
        ),
      )
    })
  })

  $('ul li, ol li').each((_, item) => {
    const text = $(item).text().replace(/\s+/g, ' ').trim()
    if (!text) return
    const lineHint = collectKnownLineMatch(lineNames, text)
    const stationCandidates = collectLikelyStationList(text)
    if (lineHint) {
      facts.push({
        ...buildFact(
          artifact,
          'LINE_REFERENCE',
          `List reference to ${lineHint}`,
          trimSnippet(text),
          0.76,
          { lineName: lineHint, extractedFrom: 'html-list' },
        ),
        lineName: lineHint,
      })
    }
    if (stationCandidates.length === 1 && stationCandidates[0].length >= 4) {
      facts.push(
        buildFact(
          artifact,
          'STATION_REFERENCE',
          `Station list reference ${stationCandidates[0]}`,
          trimSnippet(text),
          0.72,
          {
            stopName: stationCandidates[0],
            lineName: lineHint || null,
            extractedFrom: 'html-list',
          },
        ),
      )
    }
  })

  return facts
}

const extractTextualLineFacts = ({
  artifact,
  text,
  lineNames,
}: {
  artifact: CollectedArtifact
  text: string
  lineNames: string[]
}) => {
  const facts: ExtractedArtifactFact[] = []
  const normalizedText = normalize(text)
  const lineNamesByNormalized = new Map(
    lineNames
      .map((lineName) => [normalize(lineName), lineName] as const)
      .filter((entry) => entry[0]),
  )

  for (const lineName of lineNames) {
    const normalizedLineName = normalize(lineName)
    if (!normalizedLineName || !normalizedText.includes(normalizedLineName)) continue

    facts.push({
      ...buildFact(
        artifact,
        'LINE_REFERENCE',
        `Official reference to ${lineName}`,
        trimSnippet(text),
        artifact.artifactType === 'PRESS_RELEASE' ? 0.85 : 0.77,
        { lineName },
      ),
      lineName,
    })

    const escapedLineName = lineName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const renamePatterns = [
      new RegExp(`${escapedLineName}\\s+(?:has\\s+been\\s+|was\\s+)?renamed\\s+to\\s+([^.;,]+)`, 'i'),
      new RegExp(`${escapedLineName}\\s+(?:is\\s+now|will\\s+be\\s+known\\s+as)\\s+([^.;,]+)`, 'i'),
    ]

    for (const pattern of renamePatterns) {
      const match = text.match(pattern)
      const nextLineName = match?.[1]?.trim()
      if (!nextLineName || nextLineName.length < 2) continue
      facts.push({
        ...buildFact(
          artifact,
          'LINE_RENAME_REFERENCE',
          `Official rename for ${lineName}`,
          trimSnippet(match[0]),
          artifact.artifactType === 'PRESS_RELEASE' ? 0.9 : 0.8,
          {
            previousLineName: lineName,
            nextLineName,
          },
        ),
        lineName,
      })
      break
    }

    const colorPatterns = [
      new RegExp(`${escapedLineName}[^.]{0,80}\\b(colou?r)\\s+(?:is\\s+|:)?\\s*(#[0-9a-fA-F]{6}|[A-Za-z]+)`, 'i'),
      new RegExp(`(#[0-9a-fA-F]{6}|[A-Za-z]+)\\s+${escapedLineName}\\s+(?:line|service)?`, 'i'),
    ]

    for (const pattern of colorPatterns) {
      const match = text.match(pattern)
      const proposedColor = normalizeHexColor(match?.[2] || match?.[1] || null)
      if (!proposedColor) continue
      facts.push({
        ...buildFact(
          artifact,
          'LINE_COLOR_REFERENCE',
          `Official color for ${lineName}`,
          trimSnippet(match[0]),
          artifact.artifactType === 'MAP_PDF' ? 0.9 : 0.82,
          {
            color: proposedColor,
          },
        ),
        lineName,
      })
      break
    }

    const stationListPatterns = [
      new RegExp(`${escapedLineName}[^\\n]{0,160}(?:stations?|stops?)\\s*[:\\-]\\s*([^\\n]+)`, 'i'),
      new RegExp(`${escapedLineName}\\s*[–—:-]\\s*([^\\n]{8,200})`, 'i'),
    ]

    for (const pattern of stationListPatterns) {
      const match = text.match(pattern)
      const stationList = match?.[1]
      if (!stationList) continue
      const stationNames = stationList
        .split(/(?:,|>|→|\/|\||;)/)
        .map((value) => value.trim())
        .filter((value) => value.length >= 3 && value.length <= 80)
        .slice(0, 10)
      if (stationNames.length < 2) continue
      stationNames.forEach((stationName) => {
        facts.push(
          buildFact(
            artifact,
            'STATION_REFERENCE',
            `Official station list reference ${stationName}`,
            trimSnippet(match[0]),
            artifact.artifactType === 'MAP_PDF' ? 0.8 : 0.74,
            {
              stopName: stationName,
              lineName,
              extractedFrom: 'text-station-list',
            },
          ),
        )
      })
      break
    }
  }

  for (const match of text.matchAll(/\b(Line|Route|Metro|Métro|RER)\s+([0-9A-Za-z]+)\b/gi)) {
    const lineLabel = `${match[1]} ${match[2]}`
    const matchedLine = collectKnownLineMatch(lineNames, lineLabel) || lineNamesByNormalized.get(normalize(lineLabel))
    if (!matchedLine) continue
    facts.push({
      ...buildFact(
        artifact,
        'LINE_REFERENCE',
        `Official reference to ${matchedLine}`,
        trimSnippet(match[0]),
        0.74,
        { lineName: matchedLine },
      ),
      lineName: matchedLine,
    })
  }

  return facts
}

export const extractOfficialArtifactFacts = async ({
  city,
  artifacts,
  lineNames,
}: {
  city: string
  artifacts: CollectedArtifact[]
  lineNames: string[]
}) => {
  const facts: ExtractedArtifactFact[] = []

  for (const artifact of artifacts.filter((item) =>
    ['OFFICIAL_PAGE', 'PRESS_RELEASE', 'MAP_PDF', 'GTFS_FEED'].includes(item.artifactType),
  )) {
    if (artifact.artifactType === 'GTFS_FEED') {
      facts.push(...(await extractGtfsFacts({ artifact, city, lineNames })))
      continue
    }

    const text = await readArtifactText(artifact)
    const normalizedText = normalize(text)
    if (!normalizedText) continue

    if (artifact.mimeType?.includes('html')) {
      const rawBuffer = readArtifactBuffer(artifact)
      if (rawBuffer) {
        try {
          facts.push(
            ...extractHtmlStructuredFacts({
              artifact,
              rawHtml: rawBuffer.toString('utf8'),
              lineNames,
            }),
          )
        } catch {
          // ignore malformed html artifacts
        }
      }
    }

    facts.push(...collectOperatorFact(artifact, text))

    if (/map|network map|system map|route map|legend/i.test(text)) {
      facts.push(
        buildFact(
          artifact,
          'MAP_REFERENCE',
          'Official map reference',
          trimSnippet(text),
          artifact.artifactType === 'MAP_PDF' ? 0.86 : 0.74,
        ),
      )
    }

    if (/open|opening|opened|launch|launched|inaugurat|commence service|apertur|ouvert|abierto|启用|开通|開通/i.test(text)) {
      facts.push(
        buildFact(
          artifact,
          'OPENING_REFERENCE',
          'Official opening reference',
          trimSnippet(text),
          artifact.artifactType === 'PRESS_RELEASE' ? 0.88 : 0.76,
        ),
      )
    }

    if (/extend|extension|phase\s*\d|phase ii|phase iii|expansion|延伸|延长|prolong/i.test(text)) {
      facts.push(
        buildFact(
          artifact,
          'EXTENSION_REFERENCE',
          'Official extension reference',
          trimSnippet(text),
          artifact.artifactType === 'PRESS_RELEASE' ? 0.86 : 0.74,
        ),
      )
    }

    if (/closed|suspend|shutdown|replacement bus|out of service/i.test(text)) {
      facts.push(
        buildFact(
          artifact,
          'CONFLICT_REFERENCE',
          'Official service conflict reference',
          trimSnippet(text),
          0.72,
        ),
      )
    }

    facts.push(...extractTextualLineFacts({ artifact, text, lineNames }))

    const groundedExtraction = await extractGroundedFactsFromArtifact({
      artifact,
      text,
      city,
      lineNames,
    }).catch(() => null)
    if (groundedExtraction?.facts?.length) {
      facts.push(...groundedExtraction.facts)
    }
  }

  const seen = new Set<string>()
  return facts.filter((fact) => {
    const nextLineName =
      fact.metadata && typeof fact.metadata === 'object' && 'nextLineName' in fact.metadata
        ? String(fact.metadata.nextLineName || '')
        : ''
    const color =
      fact.metadata && typeof fact.metadata === 'object' && 'color' in fact.metadata
        ? String(fact.metadata.color || '')
        : ''
    const key = [
      fact.artifactType,
      fact.kind,
      fact.lineName || '',
      nextLineName,
      color,
      fact.sourceUrl || '',
      fact.label,
    ].join('|')
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

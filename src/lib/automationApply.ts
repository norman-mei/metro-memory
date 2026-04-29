import fs from 'fs'
import path from 'path'

import { AutomationClaimStatus, AutomationRunStatus } from '@prisma/client'
import sharp from 'sharp'

import {
  applyDraftLineGroupUpdate,
  applyInlineLinePatch,
  applyInlineLinesExportUpdate,
  buildLineRecord,
  configUsesLinesData,
  findBootstrapRegistryLineMatch,
} from '@/lib/automationApplyHelpers'
import { refreshAutomationAuditMetrics } from '@/lib/automationAudit'
import { prisma } from '@/lib/prisma'
import { CITY_PATH_MAP } from '@/lib/cityPathMap'

const ROOT = process.cwd()

type ApplyCandidateResult = {
  candidateId: string
  applied: boolean
  note: string
}

type ApplyApprovedCandidatesOptions = {
  candidateIds?: string[]
}

type CityState = {
  slug: string
  cityDir: string
  dataDir: string
  configPath: string
  featuresPath: string
  linesPath: string
  routesPath: string
  publicDataPath: string
  registryPath: string
  featuresJson: any
  linesJson: Record<string, any>
  routesJson: any
  registryJson: any
  configSource: string
  featuresDirty: boolean
  linesDirty: boolean
  configDirty: boolean
  registryDirty: boolean
  writtenPaths: Set<string>
}

function getCityPaths(slug: string) {
  const cityPath = CITY_PATH_MAP[slug]
  if (!cityPath) {
    throw new Error(`Could not resolve city path for ${slug}`)
  }

  const cityDir = path.join(ROOT, 'src', 'app', '(game)', cityPath)
  const dataDir = path.join(cityDir, 'data')

  return {
    cityDir,
    dataDir,
    configPath: path.join(cityDir, 'config.ts'),
    featuresPath: path.join(dataDir, 'features.json'),
    linesPath: path.join(dataDir, 'lines.json'),
    routesPath: path.join(dataDir, 'routes.json'),
    publicDataPath: path.join(ROOT, 'public', 'city-data', `${slug}.json`),
    registryPath: path.join(ROOT, 'city-registry', `${slug}.json`),
  }
}

function ensureParentDir(filePath: string) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
}

function getCityAssetDir(slug: string) {
  return path.join(ROOT, 'public', 'images', CITY_PATH_MAP[slug])
}

function readJson(filePath: string, fallback: any) {
  if (!fs.existsSync(filePath)) return fallback
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function loadCityState(slug: string): CityState {
  const paths = getCityPaths(slug)

  return {
    slug,
    cityDir: paths.cityDir,
    dataDir: paths.dataDir,
    configPath: paths.configPath,
    featuresPath: paths.featuresPath,
    linesPath: paths.linesPath,
    routesPath: paths.routesPath,
    publicDataPath: paths.publicDataPath,
    registryPath: paths.registryPath,
    featuresJson: readJson(paths.featuresPath, { type: 'FeatureCollection', features: [] }),
    linesJson: readJson(paths.linesPath, {}),
    routesJson: readJson(paths.routesPath, { type: 'FeatureCollection', features: [] }),
    registryJson: readJson(paths.registryPath, {
      city: slug,
      lines: [],
    }),
    configSource: fs.existsSync(paths.configPath)
      ? fs.readFileSync(paths.configPath, 'utf8')
      : '',
    featuresDirty: false,
    linesDirty: false,
    configDirty: false,
    registryDirty: false,
    writtenPaths: new Set<string>(),
  }
}

function buildFeatureKey(feature: any) {
  const props = feature?.properties || {}
  return `${props.line}|${props.name}`
}

function replaceOrAppendFeature(features: any[], nextFeature: any) {
  const nextKey = buildFeatureKey(nextFeature)
  const existingIndex = features.findIndex((feature) => buildFeatureKey(feature) === nextKey)
  if (existingIndex >= 0) {
    features[existingIndex] = nextFeature
    return 'replaced existing feature'
  }

  features.push(nextFeature)
  return 'added new feature'
}

function removeFeature(features: any[], entityKey: string) {
  const existingIndex = features.findIndex((feature) => buildFeatureKey(feature) === entityKey)
  if (existingIndex === -1) return false
  features.splice(existingIndex, 1)
  return true
}

function escapeSingleQuotedString(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}

function replaceQuotedProperty(source: string, property: string, value: string) {
  const escaped = escapeSingleQuotedString(value)
  const regex = new RegExp(`(${property}:\\s*)'[^']*'`, 's')
  if (!regex.test(source)) return source
  return source.replace(regex, `$1'${escaped}'`)
}

function applyMetadataOverride(configSource: string, afterValue: Record<string, any>) {
  const metadataStart = configSource.indexOf('export const METADATA')
  if (metadataStart === -1) {
    return { nextSource: configSource, changed: false, note: 'METADATA block not found' }
  }

  const metadataEndCandidates = [
    configSource.indexOf('export const MAP_CONFIG', metadataStart),
    configSource.indexOf('export const CITY_NAME', metadataStart),
  ].filter((value) => value !== -1)
  const metadataEnd =
    metadataEndCandidates.length > 0 ? Math.min(...metadataEndCandidates) : configSource.length

  const metadataBlock = configSource.slice(metadataStart, metadataEnd)
  const openGraphIndex = metadataBlock.indexOf('openGraph:')
  const topLevelBlock =
    openGraphIndex === -1 ? metadataBlock : metadataBlock.slice(0, openGraphIndex)
  const openGraphBlock =
    openGraphIndex === -1 ? '' : metadataBlock.slice(openGraphIndex)

  let nextTopLevel = topLevelBlock
  let nextOpenGraph = openGraphBlock

  if (typeof afterValue.title === 'string' && afterValue.title.trim()) {
    nextTopLevel = replaceQuotedProperty(nextTopLevel, 'title', afterValue.title.trim())
  }
  if (typeof afterValue.description === 'string' && afterValue.description.trim()) {
    nextTopLevel = replaceQuotedProperty(
      nextTopLevel,
      'description',
      afterValue.description.trim(),
    )
  }
  if (typeof afterValue.openGraphTitle === 'string' && afterValue.openGraphTitle.trim()) {
    nextOpenGraph = replaceQuotedProperty(
      nextOpenGraph,
      'title',
      afterValue.openGraphTitle.trim(),
    )
  }
  if (
    typeof afterValue.openGraphDescription === 'string' &&
    afterValue.openGraphDescription.trim()
  ) {
    nextOpenGraph = replaceQuotedProperty(
      nextOpenGraph,
      'description',
      afterValue.openGraphDescription.trim(),
    )
  }

  const nextMetadataBlock = nextTopLevel + nextOpenGraph
  if (nextMetadataBlock === metadataBlock) {
    return { nextSource: configSource, changed: false, note: 'Metadata already matched candidate' }
  }

  return {
    nextSource:
      configSource.slice(0, metadataStart) +
      nextMetadataBlock +
      configSource.slice(metadataEnd),
    changed: true,
    note: 'Updated METADATA block',
  }
}

function inferTextColor(hex: string) {
  const color = hex.replace('#', '')
  if (color.length !== 6) return '#FFFFFF'
  const r = parseInt(color.slice(0, 2), 16)
  const g = parseInt(color.slice(2, 4), 16)
  const b = parseInt(color.slice(4, 6), 16)
  const brightness = r * 0.299 + g * 0.587 + b * 0.114
  return brightness >= 150 ? '#1F1F1F' : '#FFFFFF'
}

function darkenHexColor(hex: string, factor = 0.52) {
  const color = hex.replace('#', '')
  if (color.length !== 6) return hex
  const channels = [0, 2, 4].map((index) =>
    Math.max(0, Math.min(255, Math.round(parseInt(color.slice(index, index + 2), 16) * factor))),
  )
  return `#${channels.map((value) => value.toString(16).padStart(2, '0')).join('')}`.toUpperCase()
}

function upsertRegistryLine(state: CityState, afterValue: Record<string, any>) {
  const lineId = typeof afterValue.id === 'string' ? afterValue.id.trim() : ''
  if (!lineId) {
    return { changed: false, note: 'Registry update skipped because line id is missing' }
  }

  const lines = Array.isArray(state.registryJson?.lines) ? state.registryJson.lines : []
  state.registryJson.lines = lines
  const existingIndex = lines.findIndex((entry: any) => entry?.id === lineId)

  const payload = {
    id: lineId,
    name: afterValue.name,
    keywords: Array.isArray(afterValue.keywords) ? afterValue.keywords : [],
    ...(typeof afterValue.order === 'number' ? { order: afterValue.order } : {}),
  }

  if (existingIndex >= 0) {
    lines[existingIndex] = {
      ...lines[existingIndex],
      ...payload,
    }
    state.registryDirty = true
    return { changed: true, note: `Updated ${lineId} in city-registry` }
  }

  lines.push(payload)
  state.registryDirty = true
  return { changed: true, note: `Added ${lineId} to city-registry` }
}

function updateExistingLineRecord(
  state: CityState,
  lineId: string,
  updates: Record<string, any>,
) {
  const usesLinesData = configUsesLinesData(state.configSource)

  if (usesLinesData) {
    if (!state.linesJson[lineId]) {
      return {
        changed: false,
        note: `Line ${lineId} was not found in lines.json`,
      }
    }

    state.linesJson[lineId] = {
      ...state.linesJson[lineId],
      ...updates,
    }
    state.linesDirty = true
    return {
      changed: true,
      note: `Updated ${lineId} in lines.json`,
    }
  }

  const inlineResult = applyInlineLinePatch(state.configSource, lineId, updates)
  if (!inlineResult.changed) {
    return {
      changed: false,
      note: inlineResult.note,
    }
  }

  state.configSource = inlineResult.nextSource
  state.configDirty = true
  return {
    changed: true,
    note: inlineResult.note,
  }
}

function fileExistsInRepo(relativePath: string | null | undefined) {
  if (!relativePath) return false
  return fs.existsSync(path.join(ROOT, 'public', relativePath))
}

function toRepoRelativePath(filePath: string) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/')
}

function trackWrittenPath(state: CityState, filePath: string) {
  state.writtenPaths.add(toRepoRelativePath(filePath))
}

async function applyImageCandidate(state: CityState, candidate: any) {
  const afterValue = candidate.afterValue || {}
  const targetKind = afterValue.targetKind
  const stagedRepoPath =
    typeof afterValue.stagedRepoPath === 'string' ? afterValue.stagedRepoPath : ''
  const sourcePolicyStatus = candidate?.metadata?.sourcePolicy?.status

  if (!stagedRepoPath) {
    return {
      applied: false,
      note: 'Image candidate is missing stagedRepoPath',
    }
  }

  if (sourcePolicyStatus === 'BLOCKED') {
    return {
      applied: false,
      note: 'Image candidate is blocked by source policy and cannot be auto-applied',
    }
  }

  const sourcePath = path.join(ROOT, stagedRepoPath)
  if (!fs.existsSync(sourcePath)) {
    return {
      applied: false,
      note: `Staged review image not found at ${stagedRepoPath}`,
    }
  }

  if (targetKind === 'city_card') {
    const destinationPath = path.join(
      getCityAssetDir(state.slug),
      'opengraph-image.jpg',
    )
    ensureParentDir(destinationPath)
    const rendered = await sharp(sourcePath)
      .resize(1200, 630, { fit: 'cover', position: 'centre' })
      .jpeg({ quality: 90 })
      .toBuffer()
    fs.writeFileSync(destinationPath, rendered)
    trackWrittenPath(state, destinationPath)

    return {
      applied: true,
      note: 'Applied city card image to public/images/<continent>/<country>/<city>/opengraph-image.jpg',
    }
  }

  if (targetKind === 'line_icon') {
    const destinationRelativePath =
      typeof afterValue.suggestedIconPath === 'string'
        ? afterValue.suggestedIconPath
        : null
    if (!destinationRelativePath) {
      return {
        applied: false,
        note: 'Line icon candidate is missing suggestedIconPath',
      }
    }

    const destinationPath = path.join(ROOT, 'public', destinationRelativePath)
    ensureParentDir(destinationPath)
    const rendered = await sharp(sourcePath)
      .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer()
    fs.writeFileSync(destinationPath, rendered)
    trackWrittenPath(state, destinationPath)

    const lineId =
      typeof afterValue.lineId === 'string' && afterValue.lineId.trim()
        ? afterValue.lineId.trim()
        : null

    if (lineId && state.linesJson[lineId]) {
      const color =
        typeof afterValue.extractedColor === 'string' && afterValue.extractedColor.trim()
          ? afterValue.extractedColor.trim()
          : state.linesJson[lineId].color

      state.linesJson[lineId] = {
        ...state.linesJson[lineId],
        icon: destinationRelativePath,
        ...(color
          ? {
              color,
              backgroundColor: darkenHexColor(color),
              textColor: inferTextColor(color),
              progressOutlineColor: color,
            }
          : {}),
      }
      state.linesDirty = true
    }

    return {
      applied: true,
      note: `Applied line icon to ${destinationRelativePath}`,
    }
  }

  return {
    applied: false,
    note: `Unsupported image candidate target ${targetKind}`,
  }
}

function maybeApplyNewLineCandidate(state: CityState, candidate: any) {
  const afterValue = candidate.afterValue || {}
  const bootstrapKind =
    typeof candidate?.metadata?.bootstrapKind === 'string'
      ? candidate.metadata.bootstrapKind
      : typeof afterValue?.routeSample?.bootstrapKind === 'string'
        ? afterValue.routeSample.bootstrapKind
        : null
  const existingBootstrapLineMatch =
    bootstrapKind === 'initial-registry-bootstrap'
      ? findBootstrapRegistryLineMatch(state.configSource, state.linesJson, afterValue)
      : null

  if (existingBootstrapLineMatch) {
    const mergedKeywords = Array.from(
      new Set(
        [
          ...(Array.isArray(afterValue.keywords) ? afterValue.keywords : []),
          existingBootstrapLineMatch.name,
          existingBootstrapLineMatch.id,
        ].filter((value) => typeof value === 'string' && value.trim()),
      ),
    )

    const registryResult = upsertRegistryLine(state, {
      ...afterValue,
      id: existingBootstrapLineMatch.id,
      name: existingBootstrapLineMatch.name,
      keywords: mergedKeywords,
      ...(typeof existingBootstrapLineMatch.order === 'number'
        ? { order: existingBootstrapLineMatch.order }
        : {}),
    })

    return {
      applied: registryResult.changed,
      note: registryResult.changed
        ? `Mapped bootstrap line to existing config line ${existingBootstrapLineMatch.id} and updated city-registry`
        : registryResult.note,
    }
  }

  const lineId =
    typeof afterValue.id === 'string' && afterValue.id.trim()
      ? afterValue.id.trim()
      : null
  const lineName =
    typeof afterValue.name === 'string' && afterValue.name.trim()
      ? afterValue.name.trim()
      : null
  const lineColor =
    typeof afterValue.color === 'string' && afterValue.color.trim()
      ? afterValue.color.trim()
      : null

  if (!lineId || !lineName || !lineColor) {
    return {
      applied: false,
      note: 'New-line auto-apply needs id, name, and color in candidate.afterValue',
    }
  }

  const order = Number.isFinite(afterValue.order)
    ? Number(afterValue.order)
    : Math.max(
        Object.keys(state.linesJson).length,
        Array.isArray(state.registryJson?.lines) ? state.registryJson.lines.length : 0,
      )
  const lineRecord = buildLineRecord(afterValue, order)

  if (!lineRecord) {
    return {
      applied: false,
      note: 'New-line auto-apply needs a valid line record payload',
    }
  }

  const iconPath =
    typeof afterValue.icon === 'string' && fileExistsInRepo(afterValue.icon)
      ? afterValue.icon
      : undefined
  const usesLinesData = configUsesLinesData(state.configSource)
  let applyNote = ''

  if (usesLinesData) {
    if (state.linesJson[lineId]) {
      return {
        applied: false,
        note: `Line ${lineId} already exists in lines.json`,
      }
    }

    state.linesJson[lineId] = {
      ...lineRecord,
      ...(iconPath ? { icon: iconPath } : {}),
    }
    state.linesDirty = true
    applyNote = `Added line ${lineId} to lines.json`
  } else {
    const inlineResult = applyInlineLinesExportUpdate(state.configSource, lineId, {
      ...lineRecord,
      ...(iconPath ? { icon: iconPath } : {}),
    })
    if (!inlineResult.changed) {
      return {
        applied: false,
        note: inlineResult.note,
      }
    }

    state.configSource = inlineResult.nextSource
    state.configDirty = true
    applyNote = inlineResult.note
  }

  const registryResult = upsertRegistryLine(state, afterValue)
  const groupResult = applyDraftLineGroupUpdate(state.configSource, lineId)
  if (groupResult.changed) {
    state.configSource = groupResult.nextSource
    state.configDirty = true
  }

  return {
    applied: true,
    note: `${applyNote}${registryResult.changed ? ', city-registry' : ''}${groupResult.changed ? ', and LINE_GROUPS' : ''}`,
  }
}

function maybeApplyLineRenameCandidate(state: CityState, candidate: any) {
  const afterValue = candidate.afterValue || {}
  const lineId =
    typeof afterValue.id === 'string' && afterValue.id.trim()
      ? afterValue.id.trim()
      : typeof candidate.entityKey === 'string' && candidate.entityKey.trim()
        ? candidate.entityKey.trim()
        : null
  const nextName =
    typeof afterValue.name === 'string' && afterValue.name.trim() ? afterValue.name.trim() : null

  if (!lineId || !nextName) {
    return {
      applied: false,
      note: 'Line rename candidate is missing line id or next line name',
    }
  }

  const lineUpdateResult = updateExistingLineRecord(state, lineId, { name: nextName })
  if (!lineUpdateResult.changed) {
    return {
      applied: false,
      note: lineUpdateResult.note,
    }
  }

  const registryResult = upsertRegistryLine(state, {
    ...(candidate.beforeValue || {}),
    ...(candidate.afterValue || {}),
    id: lineId,
    name: nextName,
    keywords: Array.from(
      new Set(
        [
          nextName,
          ...(Array.isArray(candidate.afterValue?.keywords) ? candidate.afterValue.keywords : []),
        ].filter((value) => typeof value === 'string' && value.trim()),
      ),
    ),
  })

  return {
    applied: true,
    note: `${lineUpdateResult.note}${registryResult.changed ? ', and city-registry' : ''}`,
  }
}

function maybeApplyLineColorCandidate(state: CityState, candidate: any) {
  const afterValue = candidate.afterValue || {}
  const lineId =
    typeof afterValue.id === 'string' && afterValue.id.trim()
      ? afterValue.id.trim()
      : typeof candidate.entityKey === 'string' && candidate.entityKey.trim()
        ? candidate.entityKey.trim()
        : null
  const color =
    typeof afterValue.color === 'string' && afterValue.color.trim()
      ? afterValue.color.trim()
      : null

  if (!lineId || !color) {
    return {
      applied: false,
      note: 'Line color candidate is missing line id or color',
    }
  }

  const lineUpdateResult = updateExistingLineRecord(state, lineId, {
    color,
    backgroundColor:
      typeof afterValue.backgroundColor === 'string' && afterValue.backgroundColor.trim()
        ? afterValue.backgroundColor.trim()
        : darkenHexColor(color),
    textColor:
      typeof afterValue.textColor === 'string' && afterValue.textColor.trim()
        ? afterValue.textColor.trim()
        : inferTextColor(color),
    progressOutlineColor:
      typeof afterValue.progressOutlineColor === 'string' &&
      afterValue.progressOutlineColor.trim()
        ? afterValue.progressOutlineColor.trim()
        : color,
  })

  return {
    applied: lineUpdateResult.changed,
    note: lineUpdateResult.note,
  }
}

async function applyCandidateToState(state: CityState, candidate: any): Promise<ApplyCandidateResult> {
  if (candidate.appliedAt) {
    return {
      candidateId: candidate.id,
      applied: false,
      note: 'Candidate already applied',
    }
  }

  const features = Array.isArray(state.featuresJson?.features) ? state.featuresJson.features : []
  state.featuresJson.features = features

  switch (candidate.type) {
    case 'NEW_STATION':
    case 'UPDATED_STATION': {
      if (!candidate.afterValue) {
        return {
          candidateId: candidate.id,
          applied: false,
          note: 'Candidate is missing afterValue station data',
        }
      }

      const detail = replaceOrAppendFeature(features, candidate.afterValue)
      state.featuresDirty = true
      return {
        candidateId: candidate.id,
        applied: true,
        note: detail,
      }
    }
    case 'REMOVED_STATION': {
      const entityKey = candidate.entityKey || buildFeatureKey(candidate.beforeValue)
      if (!entityKey) {
        return {
          candidateId: candidate.id,
          applied: false,
          note: 'Removed-station candidate is missing entity key',
        }
      }

      const removed = removeFeature(features, entityKey)
      if (!removed) {
        return {
          candidateId: candidate.id,
          applied: false,
          note: `Station ${entityKey} was not present in current features.json`,
        }
      }
      state.featuresDirty = true
      return {
        candidateId: candidate.id,
        applied: true,
        note: `Removed station ${entityKey}`,
      }
    }
    case 'METADATA_CANDIDATE':
    case 'OPERATOR_METADATA_CANDIDATE': {
      if (!state.configSource) {
        return {
          candidateId: candidate.id,
          applied: false,
          note: 'config.ts not found for city',
        }
      }

      const { nextSource, changed, note } = applyMetadataOverride(
        state.configSource,
        candidate.afterValue || {},
      )
      if (!changed) {
        return {
          candidateId: candidate.id,
          applied: false,
          note,
        }
      }

      state.configSource = nextSource
      state.configDirty = true
      return {
        candidateId: candidate.id,
        applied: true,
        note,
      }
    }
    case 'LINE_RENAME_CANDIDATE': {
      const result = maybeApplyLineRenameCandidate(state, candidate)
      return {
        candidateId: candidate.id,
        applied: result.applied,
        note: result.note,
      }
    }
    case 'LINE_COLOR_CANDIDATE': {
      const result = maybeApplyLineColorCandidate(state, candidate)
      return {
        candidateId: candidate.id,
        applied: result.applied,
        note: result.note,
      }
    }
    case 'NEW_LINE': {
      const result = maybeApplyNewLineCandidate(state, candidate)
      return {
        candidateId: candidate.id,
        applied: result.applied,
        note: result.note,
      }
    }
    case 'IMAGE_CANDIDATE': {
      return {
        candidateId: candidate.id,
        ...(await applyImageCandidate(state, candidate)),
      }
    }
    default:
      return {
        candidateId: candidate.id,
        applied: false,
        note: `Auto-apply is not configured for ${candidate.type}`,
      }
  }
}

function writeCityState(state: CityState) {
  if (state.featuresDirty) {
    ensureParentDir(state.featuresPath)
    fs.writeFileSync(state.featuresPath, JSON.stringify(state.featuresJson, null, 2))
    trackWrittenPath(state, state.featuresPath)
    ensureParentDir(state.publicDataPath)
    fs.writeFileSync(
      state.publicDataPath,
      JSON.stringify(
        {
          features: state.featuresJson,
          routes: state.routesJson,
        },
        null,
        0,
      ),
    )
    trackWrittenPath(state, state.publicDataPath)
  }

  if (state.linesDirty) {
    ensureParentDir(state.linesPath)
    fs.writeFileSync(state.linesPath, JSON.stringify(state.linesJson, null, 2))
    trackWrittenPath(state, state.linesPath)
  }

  if (state.configDirty) {
    fs.writeFileSync(state.configPath, state.configSource)
    trackWrittenPath(state, state.configPath)
  }

  if (state.registryDirty) {
    ensureParentDir(state.registryPath)
    fs.writeFileSync(state.registryPath, JSON.stringify(state.registryJson, null, 2))
    trackWrittenPath(state, state.registryPath)
  }
}

export async function applyApprovedCandidatesForRun(
  runId: string,
  appliedBy: string,
  options: ApplyApprovedCandidatesOptions = {},
) {
  const candidateIds = Array.from(new Set((options.candidateIds || []).filter(Boolean)))
  const run = await prisma.automationRun.findUnique({
    where: { id: runId },
    include: {
      candidates: {
        where: {
          status: 'APPROVED',
          appliedAt: null,
          ...(candidateIds.length > 0 ? { id: { in: candidateIds } } : {}),
        },
        orderBy: [{ citySlug: 'asc' }, { createdAt: 'asc' }],
      },
    },
  })

  if (!run) {
    throw new Error('Automation run not found')
  }

  if (!run.candidates.length) {
    return {
      runId,
      appliedCount: 0,
      skippedCount: 0,
      applied: [] as ApplyCandidateResult[],
      skipped: [] as ApplyCandidateResult[],
      note: 'No approved unapplied candidates found',
      writtenPaths: [] as string[],
    }
  }

  const cityStates = new Map<string, CityState>()
  const orderedCandidates = [...run.candidates].sort((left, right) => {
    const priority = (type: string) => {
      if (type === 'IMAGE_CANDIDATE') return 0
      if (type === 'NEW_LINE') return 1
      return 2
    }
    return priority(left.type) - priority(right.type)
  })
  const appliedResults: ApplyCandidateResult[] = []
  const skippedResults: ApplyCandidateResult[] = []

  for (const candidate of orderedCandidates) {
    if (!cityStates.has(candidate.citySlug)) {
      cityStates.set(candidate.citySlug, loadCityState(candidate.citySlug))
    }

    const state = cityStates.get(candidate.citySlug)!
    const result = await applyCandidateToState(state, candidate)

    if (result.applied) {
      appliedResults.push(result)
    } else {
      skippedResults.push(result)
    }
  }

  for (const state of cityStates.values()) {
    writeCityState(state)
  }

  const writtenPaths = Array.from(
    new Set(Array.from(cityStates.values()).flatMap((state) => Array.from(state.writtenPaths))),
  ).sort()

  const now = new Date()
  const appliedRef = `apply:${runId}:${now.toISOString()}`
  const appliedIds = appliedResults.map((result) => result.candidateId)

  await prisma.$transaction(async (tx) => {
    if (appliedIds.length > 0) {
      await tx.automationCandidate.updateMany({
        where: { id: { in: appliedIds } },
        data: {
          appliedAt: now,
          appliedBy,
          appliedRef,
          applyNote: 'Applied to repository files',
        },
      })

      await tx.automationClaim.updateMany({
        where: { candidateId: { in: appliedIds } },
        data: {
          status: AutomationClaimStatus.APPLIED,
        },
      })
    }

    for (const result of skippedResults) {
      await tx.automationCandidate.update({
        where: { id: result.candidateId },
        data: {
          applyNote: result.note,
        },
      })
    }

    const remainingApproved = await tx.automationCandidate.count({
      where: {
        runId,
        status: 'APPROVED',
        appliedAt: null,
      },
    })
    const remainingPending = await tx.automationCandidate.count({
      where: {
        runId,
        status: 'PENDING',
      },
    })

    const nextRunStatus =
      appliedIds.length > 0
        ? remainingApproved === 0 && remainingPending === 0
          ? AutomationRunStatus.APPLIED
          : AutomationRunStatus.PARTIALLY_APPLIED
        : run.status

    await tx.automationRun.update({
      where: { id: runId },
      data: {
        status: nextRunStatus,
        appliedAt: appliedIds.length > 0 ? now : run.appliedAt,
        appliedBy: appliedIds.length > 0 ? appliedBy : run.appliedBy,
        appliedRef: appliedIds.length > 0 ? appliedRef : run.appliedRef,
        summary: {
          ...(typeof run.summary === 'object' && run.summary ? (run.summary as object) : {}),
          appliedCount: appliedIds.length,
          skippedCount: skippedResults.length,
          remainingApproved,
          remainingPending,
        },
      },
    })

    await refreshAutomationAuditMetrics(tx)
  })

  return {
    runId,
    appliedCount: appliedResults.length,
    skippedCount: skippedResults.length,
    applied: appliedResults,
    skipped: skippedResults,
    appliedRef,
    writtenPaths,
  }
}

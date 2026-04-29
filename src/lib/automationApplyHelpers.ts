type ApplySourceResult = {
  nextSource: string
  changed: boolean
  note: string
}

export type ExistingLineDescriptor = {
  id: string
  name: string
  order?: number
}

type LineRecord = {
  name: string
  color: string
  backgroundColor: string
  textColor: string
  order: number
  icon?: string
  progressOutlineColor?: string
}

type PartialLineRecord = Partial<LineRecord>

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function escapeSingleQuotedString(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}

function stripWrappedQuotes(value: string) {
  return value.replace(/^['"]|['"]$/g, '')
}

function formatObjectKey(value: string) {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(value) ? value : `'${escapeSingleQuotedString(value)}'`
}

export function findMatchingDelimiter(
  source: string,
  startIndex: number,
  openChar: string,
  closeChar: string,
) {
  let depth = 0
  let inSingleQuote = false
  let inDoubleQuote = false
  let inTemplate = false
  let escaped = false

  for (let index = startIndex; index < source.length; index += 1) {
    const char = source[index]

    if (escaped) {
      escaped = false
      continue
    }

    if (char === '\\') {
      escaped = true
      continue
    }

    if (inSingleQuote) {
      if (char === "'") inSingleQuote = false
      continue
    }
    if (inDoubleQuote) {
      if (char === '"') inDoubleQuote = false
      continue
    }
    if (inTemplate) {
      if (char === '`') inTemplate = false
      continue
    }

    if (char === "'") {
      inSingleQuote = true
      continue
    }
    if (char === '"') {
      inDoubleQuote = true
      continue
    }
    if (char === '`') {
      inTemplate = true
      continue
    }

    if (char === openChar) depth += 1
    if (char === closeChar) {
      depth -= 1
      if (depth === 0) return index
    }
  }

  return -1
}

export function applyDraftLineGroupUpdate(configSource: string, lineId: string): ApplySourceResult {
  const groupsStart = configSource.indexOf('export const LINE_GROUPS')
  if (groupsStart === -1) {
    return { nextSource: configSource, changed: false, note: 'LINE_GROUPS block not found' }
  }

  const arrayStart = configSource.indexOf('[', groupsStart)
  if (arrayStart === -1) {
    return { nextSource: configSource, changed: false, note: 'LINE_GROUPS array not found' }
  }

  const arrayEnd = findMatchingDelimiter(configSource, arrayStart, '[', ']')
  if (arrayEnd === -1) {
    return { nextSource: configSource, changed: false, note: 'LINE_GROUPS array is malformed' }
  }

  const groupsBlock = configSource.slice(arrayStart, arrayEnd + 1)
  if (groupsBlock.includes(`'${lineId}'`) || groupsBlock.includes(`"${lineId}"`)) {
    return {
      nextSource: configSource,
      changed: false,
      note: `Line ${lineId} already present in LINE_GROUPS`,
    }
  }

  const draftTitleIndex = groupsBlock.indexOf("title: 'Automation Draft'")
  let nextGroupsBlock = groupsBlock

  if (draftTitleIndex !== -1) {
    const draftSlice = groupsBlock.slice(draftTitleIndex)
    const linesMatch = draftSlice.match(/lines:\s*\[([\s\S]*?)\]/)

    if (linesMatch) {
      const originalLinesBlock = linesMatch[0]
      const inner = linesMatch[1].trim()
      const updatedLinesBlock = inner
        ? `lines: [${inner}, '${lineId}']`
        : `lines: ['${lineId}']`
      const lineBlockStart = draftTitleIndex + linesMatch.index!
      nextGroupsBlock =
        groupsBlock.slice(0, lineBlockStart) +
        updatedLinesBlock +
        groupsBlock.slice(lineBlockStart + originalLinesBlock.length)
    }
  } else {
    const insertion = `,\n  {\n    title: 'Automation Draft',\n    items: [\n      {\n        type: 'lines',\n        title: 'Review queue',\n        lines: ['${lineId}'],\n      },\n    ],\n  }\n`
    nextGroupsBlock = `${groupsBlock.slice(0, -1)}${insertion}]`
  }

  return {
    nextSource:
      configSource.slice(0, arrayStart) +
      nextGroupsBlock +
      configSource.slice(arrayEnd + 1),
    changed: nextGroupsBlock !== groupsBlock,
    note: 'Updated LINE_GROUPS with automation draft line',
  }
}

export function configUsesLinesData(configSource: string) {
  return /import\s+\w+\s+from\s+['"]\.\/data\/lines\.json['"]/.test(configSource)
}

function extractInlineLinesObject(configSource: string) {
  const linesStart = configSource.indexOf('export const LINES')
  if (linesStart === -1) return null

  const assignmentIndex = configSource.indexOf('=', linesStart)
  if (assignmentIndex === -1) return null

  const objectStart = configSource.indexOf('{', assignmentIndex)
  if (objectStart === -1) return null

  const objectEnd = findMatchingDelimiter(configSource, objectStart, '{', '}')
  if (objectEnd === -1) return null

  return configSource.slice(objectStart, objectEnd + 1)
}

export function extractInlineConfiguredLines(configSource: string): ExistingLineDescriptor[] {
  const linesObject = extractInlineLinesObject(configSource)
  if (!linesObject) return []

  try {
    const evaluated = Function(`"use strict"; return (${linesObject});`)() as Record<string, any>
    return Object.entries(evaluated || {})
      .filter((entry) => entry[1] && typeof entry[1] === 'object')
      .map(([id, value]) => ({
        id: stripWrappedQuotes(id),
        name:
          typeof value.name === 'string' && value.name.trim()
            ? value.name.trim()
            : stripWrappedQuotes(id),
        ...(Number.isFinite(value.order) ? { order: Number(value.order) } : {}),
      }))
  } catch {
    return []
  }
}

function collectEnglishLikeLineRefs(value: string) {
  const refs = new Set<string>()

  for (const match of value.matchAll(/\bS\s*([0-9]+[A-Za-z]*)\b/gi)) {
    refs.add(`s${match[1].toLowerCase()}`)
  }

  for (const match of value.matchAll(/\bU\s*([0-9]+[A-Za-z]*)\b/gi)) {
    refs.add(`u${match[1].toLowerCase()}`)
  }

  for (const match of value.matchAll(/\bLine\s*([0-9]+[A-Za-z]*)\b/gi)) {
    refs.add(`line${match[1].toLowerCase()}`)
  }

  for (const match of value.matchAll(/\bM[ée]tro\s*([0-9]+[A-Za-z]*)\b/gi)) {
    refs.add(`metro${match[1].toLowerCase()}`)
  }

  for (const match of value.matchAll(/\bRER\s*([A-Za-z])\b/gi)) {
    refs.add(`rer${match[1].toLowerCase()}`)
  }

  for (const match of value.matchAll(
    /\b(blue|green|orange|red|silver|yellow|bakerloo|central|circle|district|hammersmith(?:\s+and\s+|\s*&\s*)city|jubilee|metropolitan|northern|piccadilly|victoria|waterloo(?:\s+and\s+|\s*&\s*)city|dlr|overground|elizabeth(?:\s+line)?)\b/gi,
  )) {
    refs.add(match[1].replace(/\s*(?:&|and)\s*/gi, '').replace(/\s+/g, '').toLowerCase())
  }

  for (const match of value.matchAll(/([0-9]+)\s*号线/gu)) {
    refs.add(`line${match[1]}`)
  }

  return refs
}

function sanitizeLineLabel(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(
      /\b(metro|subway|rail\s*transit|railtransit|route|tram|line|wmata|mtr|lrt|mrt)\b/g,
      ' ',
    )
    .replace(/[^\p{L}\p{N}]+/gu, '')
}

function collectBootstrapCandidateTexts(afterValue: Record<string, any>) {
  const routeSample =
    afterValue.routeSample && typeof afterValue.routeSample === 'object' ? afterValue.routeSample : {}

  return [
    typeof afterValue.id === 'string' ? afterValue.id : '',
    typeof afterValue.name === 'string' ? afterValue.name : '',
    typeof afterValue.sourceName === 'string' ? afterValue.sourceName : '',
    typeof routeSample.ref === 'string' ? routeSample.ref : '',
    typeof routeSample.name === 'string' ? routeSample.name : '',
    typeof routeSample['name:en'] === 'string' ? routeSample['name:en'] : '',
    typeof routeSample['name:zh'] === 'string' ? routeSample['name:zh'] : '',
    ...(Array.isArray(afterValue.keywords) ? afterValue.keywords.filter((item) => typeof item === 'string') : []),
  ]
    .map((value) => value.trim())
    .filter(Boolean)
}

export function findBootstrapRegistryLineMatch(
  configSource: string,
  linesJson: Record<string, any>,
  afterValue: Record<string, any>,
): ExistingLineDescriptor | null {
  const existingLines: ExistingLineDescriptor[] = [
    ...Object.entries(linesJson || {})
      .filter((entry) => entry[1] && typeof entry[1] === 'object')
      .map(([id, value]) => ({
        id,
        name: typeof value.name === 'string' && value.name.trim() ? value.name.trim() : id,
        ...(Number.isFinite(value.order) ? { order: Number(value.order) } : {}),
      })),
    ...extractInlineConfiguredLines(configSource),
  ]

  if (existingLines.length === 0) return null

  const candidateTexts = collectBootstrapCandidateTexts(afterValue)
  const candidateRefs = new Set(candidateTexts.flatMap((text) => Array.from(collectEnglishLikeLineRefs(text))))
  const candidateSanitized = new Set(candidateTexts.map(sanitizeLineLabel).filter(Boolean))

  const matches = existingLines
    .map((line) => {
      const lineTexts = [line.id, line.name].filter(Boolean)
      const lineRefs = new Set(lineTexts.flatMap((text) => Array.from(collectEnglishLikeLineRefs(text))))
      const sharedRefs = Array.from(lineRefs).filter((ref) => candidateRefs.has(ref))
      const lineSanitized = lineTexts.map(sanitizeLineLabel).filter(Boolean)

      let score = 0
      if (sharedRefs.length > 0) score += 100
      if (lineSanitized.some((value) => candidateSanitized.has(value))) score += 40
      if (
        lineSanitized.some(
          (value) =>
            value.length >= 2 &&
            Array.from(candidateSanitized).some(
              (candidate) => candidate.endsWith(value) || value.endsWith(candidate),
            ),
        )
      ) {
        score += 20
      }

      return {
        line,
        score,
      }
    })
    .filter((entry) => entry.score >= 80)
    .sort((left, right) => right.score - left.score || left.line.id.localeCompare(right.line.id))

  if (matches.length === 0) return null
  if (matches.length > 1 && matches[0].score === matches[1].score) return null

  return matches[0].line
}

export function buildLineRecord(
  afterValue: Record<string, any>,
  fallbackOrder: number,
): LineRecord | null {
  const name = typeof afterValue.name === 'string' ? afterValue.name.trim() : ''
  const color = typeof afterValue.color === 'string' ? afterValue.color.trim() : ''

  if (!name || !color) return null

  return {
    name,
    color,
    backgroundColor:
      typeof afterValue.backgroundColor === 'string' && afterValue.backgroundColor.trim()
        ? afterValue.backgroundColor.trim()
        : color,
    textColor:
      typeof afterValue.textColor === 'string' && afterValue.textColor.trim()
        ? afterValue.textColor.trim()
        : '#FFFFFF',
    order: Number.isFinite(afterValue.order) ? Number(afterValue.order) : fallbackOrder,
    ...(typeof afterValue.icon === 'string' && afterValue.icon.trim()
      ? { icon: afterValue.icon.trim() }
      : {}),
    ...(typeof afterValue.progressOutlineColor === 'string' &&
    afterValue.progressOutlineColor.trim()
      ? { progressOutlineColor: afterValue.progressOutlineColor.trim() }
      : { progressOutlineColor: color }),
  }
}

function formatLineRecord(key: string, lineRecord: LineRecord) {
  const fields = [
    `name: '${escapeSingleQuotedString(lineRecord.name)}'`,
    `color: '${escapeSingleQuotedString(lineRecord.color)}'`,
    `backgroundColor: '${escapeSingleQuotedString(lineRecord.backgroundColor)}'`,
    `textColor: '${escapeSingleQuotedString(lineRecord.textColor)}'`,
    `order: ${lineRecord.order}`,
    ...(lineRecord.icon ? [`icon: '${escapeSingleQuotedString(lineRecord.icon)}'`] : []),
    ...(lineRecord.progressOutlineColor
      ? [`progressOutlineColor: '${escapeSingleQuotedString(lineRecord.progressOutlineColor)}'`]
      : []),
  ]

  return `  ${formatObjectKey(key)}: {\n    ${fields.join(',\n    ')},\n  }`
}

export function applyInlineLinesExportUpdate(
  configSource: string,
  lineId: string,
  lineRecord: LineRecord,
): ApplySourceResult {
  const linesStart = configSource.indexOf('export const LINES')
  if (linesStart === -1) {
    return { nextSource: configSource, changed: false, note: 'LINES block not found' }
  }

  const assignmentIndex = configSource.indexOf('=', linesStart)
  if (assignmentIndex === -1) {
    return { nextSource: configSource, changed: false, note: 'LINES assignment not found' }
  }

  const objectStart = configSource.indexOf('{', assignmentIndex)
  if (objectStart === -1) {
    return { nextSource: configSource, changed: false, note: 'LINES object not found' }
  }

  const objectEnd = findMatchingDelimiter(configSource, objectStart, '{', '}')
  if (objectEnd === -1) {
    return { nextSource: configSource, changed: false, note: 'LINES object is malformed' }
  }

  const linesBlock = configSource.slice(objectStart, objectEnd + 1)
  const existingLinePattern = new RegExp(
    `(^|\\n)\\s*(?:${escapeRegExp(lineId)}|'${escapeRegExp(lineId)}'|"${escapeRegExp(lineId)}")\\s*:`,
  )

  if (existingLinePattern.test(linesBlock)) {
    return {
      nextSource: configSource,
      changed: false,
      note: `Line ${lineId} already present in inline LINES export`,
    }
  }

  const entry = formatLineRecord(lineId, lineRecord)
  const inner = linesBlock.slice(1, -1).trim()
  const nextLinesBlock = inner ? `{\n${inner},\n${entry}\n}` : `{\n${entry}\n}`

  return {
    nextSource:
      configSource.slice(0, objectStart) +
      nextLinesBlock +
      configSource.slice(objectEnd + 1),
    changed: true,
    note: `Added line ${lineId} to inline LINES export`,
  }
}

export function applyInlineLinePatch(
  configSource: string,
  lineId: string,
  updates: PartialLineRecord,
): ApplySourceResult {
  const linesStart = configSource.indexOf('export const LINES')
  if (linesStart === -1) {
    return { nextSource: configSource, changed: false, note: 'LINES block not found' }
  }

  const assignmentIndex = configSource.indexOf('=', linesStart)
  if (assignmentIndex === -1) {
    return { nextSource: configSource, changed: false, note: 'LINES assignment not found' }
  }

  const objectStart = configSource.indexOf('{', assignmentIndex)
  if (objectStart === -1) {
    return { nextSource: configSource, changed: false, note: 'LINES object not found' }
  }

  const objectEnd = findMatchingDelimiter(configSource, objectStart, '{', '}')
  if (objectEnd === -1) {
    return { nextSource: configSource, changed: false, note: 'LINES object is malformed' }
  }

  const linesBlock = configSource.slice(objectStart, objectEnd + 1)
  const entryPattern = new RegExp(
    `(^|\\n)\\s*(?:${escapeRegExp(lineId)}|'${escapeRegExp(lineId)}'|"${escapeRegExp(lineId)}")\\s*:\\s*\\{`,
    'm',
  )
  const match = entryPattern.exec(linesBlock)
  if (!match) {
    return {
      nextSource: configSource,
      changed: false,
      note: `Line ${lineId} not found in inline LINES export`,
    }
  }

  const entryStart = match.index + match[0].length - 1
  const entryEnd = findMatchingDelimiter(linesBlock, entryStart, '{', '}')
  if (entryEnd === -1) {
    return {
      nextSource: configSource,
      changed: false,
      note: `Line ${lineId} entry is malformed`,
    }
  }

  let entryBlock = linesBlock.slice(entryStart, entryEnd + 1)
  const originalEntryBlock = entryBlock
  for (const [key, rawValue] of Object.entries(updates)) {
    if (rawValue === undefined) continue
    const value =
      typeof rawValue === 'number'
        ? String(rawValue)
        : `'${escapeSingleQuotedString(String(rawValue))}'`
    const propertyPattern = new RegExp(`(${key}:\\s*)(?:'[^']*'|\"[^\"]*\"|[0-9.]+)`, 's')
    if (propertyPattern.test(entryBlock)) {
      entryBlock = entryBlock.replace(propertyPattern, `$1${value}`)
      continue
    }

    const trimmed = entryBlock.trimEnd()
    entryBlock = `${trimmed.slice(0, -1)},\n  ${key}: ${value}\n}`
  }

  if (entryBlock === originalEntryBlock) {
    return {
      nextSource: configSource,
      changed: false,
      note: `Line ${lineId} already matched inline update`,
    }
  }

  const nextLinesBlock =
    linesBlock.slice(0, entryStart) + entryBlock + linesBlock.slice(entryEnd + 1)

  return {
    nextSource:
      configSource.slice(0, objectStart) +
      nextLinesBlock +
      configSource.slice(objectEnd + 1),
    changed: true,
    note: `Updated inline LINES entry for ${lineId}`,
  }
}

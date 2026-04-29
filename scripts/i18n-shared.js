#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const ts = require('typescript')

const ROOT = path.resolve(__dirname, '..')
const I18N_SOURCE_FILE = path.join(ROOT, 'src', 'lib', 'i18n.tsx')
const GENERATED_OVERRIDES_FILE = path.join(ROOT, 'src', 'lib', 'i18nAutoOverrides.json')
const DEFAULT_CATALOG_OUTPUT_DIR = path.join(ROOT, 'src', 'locales', 'catalog')

const LEGACY_LANGUAGE_CODE_MAP = {
  jp: 'ja',
}

const ROSETTA_LANGUAGE_CODE_MAP = {
  ja: 'jp',
}

const ENGLISH_LOCALE = 'en'

function normalizeLanguageCode(value) {
  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }

  return LEGACY_LANGUAGE_CODE_MAP[trimmed] ?? trimmed
}

function toRosettaLanguageCode(value) {
  const normalized = normalizeLanguageCode(value)
  if (!normalized) {
    return null
  }
  return ROSETTA_LANGUAGE_CODE_MAP[normalized] ?? normalized
}

function getPropertyName(node) {
  if (ts.isIdentifier(node) || ts.isStringLiteral(node)) {
    return node.text
  }
  return null
}

function unwrapExpression(node) {
  let current = node
  while (
    current &&
    (ts.isAsExpression(current) || ts.isSatisfiesExpression?.(current) || ts.isParenthesizedExpression(current))
  ) {
    current = current.expression
  }
  return current
}

function getNodeSource(sourceText, node) {
  return sourceText.slice(node.getStart(), node.getEnd()).trim()
}

function extractFunctionParamNames(node) {
  const names = new Set()

  const collect = (paramNode) => {
    if (ts.isIdentifier(paramNode)) {
      names.add(paramNode.text)
      return
    }
    if (ts.isObjectBindingPattern(paramNode) || ts.isArrayBindingPattern(paramNode)) {
      paramNode.elements.forEach((element) => {
        if (ts.isBindingElement(element)) {
          collect(element.name)
        }
      })
    }
  }

  node.parameters.forEach((parameter) => {
    collect(parameter.name)
  })

  return Array.from(names)
}

function extractBracePlaceholders(value) {
  const matches = value.match(/\{([A-Za-z0-9_]+)\}/g) ?? []
  return Array.from(
    new Set(
      matches
        .map((match) => match.slice(1, -1).trim())
        .filter(Boolean),
    ),
  )
}

function buildEntry(sourceFile, sourceText, node) {
  const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart())
  const entry = {
    line: line + 1,
    source: getNodeSource(sourceText, node),
  }

  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return {
      ...entry,
      kind: 'text',
      value: node.text,
      placeholders: extractBracePlaceholders(node.text),
    }
  }

  if (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {
    return {
      ...entry,
      kind: 'function',
      params: extractFunctionParamNames(node),
    }
  }

  if (ts.isTemplateExpression(node)) {
    return {
      ...entry,
      kind: 'template',
      placeholders: Array.from(
        new Set(
          node.templateSpans
            .map((span) => getNodeSource(sourceText, span.expression))
            .filter(Boolean),
        ),
      ),
    }
  }

  return {
    ...entry,
    kind: 'expression',
  }
}

function flattenObjectLiteral(sourceFile, sourceText, node, prefix = '', out = {}) {
  node.properties.forEach((property) => {
    if (!ts.isPropertyAssignment(property)) {
      return
    }

    const name = getPropertyName(property.name)
    if (!name) {
      return
    }

    const key = prefix ? `${prefix}.${name}` : name
    const { initializer } = property

    if (ts.isObjectLiteralExpression(initializer)) {
      flattenObjectLiteral(sourceFile, sourceText, initializer, key, out)
      return
    }

    out[key] = buildEntry(sourceFile, sourceText, initializer)
  })

  return out
}

function parseI18nSource() {
  const sourceText = fs.readFileSync(I18N_SOURCE_FILE, 'utf8')
  const sourceFile = ts.createSourceFile(
    I18N_SOURCE_FILE,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  )

  let supportedLanguagesNode = null
  let rosettaArgNode = null

  const visit = (node) => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === 'SUPPORTED_LANGUAGES' &&
      node.initializer &&
      ts.isArrayLiteralExpression(unwrapExpression(node.initializer))
    ) {
      supportedLanguagesNode = unwrapExpression(node.initializer)
    }

    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'rosetta' &&
      node.arguments.length > 0 &&
      ts.isObjectLiteralExpression(node.arguments[0])
    ) {
      rosettaArgNode = node.arguments[0]
    }

    ts.forEachChild(node, visit)
  }

  visit(sourceFile)

  if (!supportedLanguagesNode) {
    throw new Error('Could not find SUPPORTED_LANGUAGES in src/lib/i18n.tsx')
  }

  if (!rosettaArgNode) {
    throw new Error('Could not find rosetta({...}) in src/lib/i18n.tsx')
  }

  const supportedLanguages = supportedLanguagesNode.elements
    .map((element) => {
      if (!ts.isObjectLiteralExpression(element)) {
        return null
      }

      let code = null
      let label = null

      element.properties.forEach((property) => {
        if (!ts.isPropertyAssignment(property)) {
          return
        }
        const name = getPropertyName(property.name)
        if (name === 'code' && ts.isStringLiteral(property.initializer)) {
          code = normalizeLanguageCode(property.initializer.text)
        }
        if (name === 'label' && ts.isStringLiteral(property.initializer)) {
          label = property.initializer.text
        }
      })

      return code ? { code, label } : null
    })
    .filter(Boolean)

  const locales = {}

  rosettaArgNode.properties.forEach((property) => {
    if (!ts.isPropertyAssignment(property) || !ts.isObjectLiteralExpression(property.initializer)) {
      return
    }

    const localeName = normalizeLanguageCode(getPropertyName(property.name))
    if (!localeName) {
      return
    }

    locales[localeName] = flattenObjectLiteral(
      sourceFile,
      sourceText,
      property.initializer,
    )
  })

  return {
    sourceText,
    sourceFile,
    supportedLanguages,
    locales,
  }
}

function ensureDirectory(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true })
}

function writeJson(filePath, data) {
  ensureDirectory(path.dirname(filePath))
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`)
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function flattenNestedTextEntries(node, prefix = '', out = {}) {
  if (!node || typeof node !== 'object' || Array.isArray(node)) {
    return out
  }

  Object.entries(node).forEach(([key, value]) => {
    const pathKey = prefix ? `${prefix}.${key}` : key
    if (typeof value === 'string') {
      out[pathKey] = value
      return
    }

    flattenNestedTextEntries(value, pathKey, out)
  })

  return out
}

function buildNestedTextEntries(flatEntries) {
  const nested = {}

  Object.entries(flatEntries).forEach(([flatKey, value]) => {
    if (typeof value !== 'string') {
      return
    }

    const parts = flatKey.split('.')
    let cursor = nested

    parts.forEach((part, index) => {
      const isLeaf = index === parts.length - 1
      if (isLeaf) {
        cursor[part] = value
        return
      }
      if (!cursor[part] || typeof cursor[part] !== 'object' || Array.isArray(cursor[part])) {
        cursor[part] = {}
      }
      cursor = cursor[part]
    })
  })

  return nested
}

function deepMerge(target, source) {
  if (!source || typeof source !== 'object' || Array.isArray(source)) {
    return target
  }

  Object.entries(source).forEach(([key, value]) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const base =
        target[key] && typeof target[key] === 'object' && !Array.isArray(target[key])
          ? target[key]
          : {}
      target[key] = deepMerge({ ...base }, value)
      return
    }
    target[key] = value
  })

  return target
}

function loadGeneratedOverrides() {
  if (!fs.existsSync(GENERATED_OVERRIDES_FILE)) {
    return {
      $schemaVersion: 1,
      generatedAt: null,
      locales: {},
    }
  }

  const parsed = readJson(GENERATED_OVERRIDES_FILE)
  const locales = {}

  Object.entries(parsed.locales ?? {}).forEach(([locale, value]) => {
    const normalized = normalizeLanguageCode(locale)
    if (!normalized) {
      return
    }
    locales[normalized] = value
  })

  return {
    $schemaVersion: parsed.$schemaVersion ?? 1,
    generatedAt: parsed.generatedAt ?? null,
    locales,
  }
}

function buildCombinedCatalog(baseCatalog, overrides) {
  const combined = {}

  Object.entries(baseCatalog).forEach(([locale, entries]) => {
    combined[locale] = { ...entries }
  })

  Object.entries(overrides.locales ?? {}).forEach(([locale, table]) => {
    if (!combined[locale]) {
      combined[locale] = {}
    }
    const flat = flattenNestedTextEntries(table)
    Object.entries(flat).forEach(([key, value]) => {
      combined[locale][key] = {
        kind: 'text',
        value,
        line: 0,
        source: '[generated override]',
        placeholders: extractBracePlaceholders(value),
      }
    })
  })

  return combined
}

function parseArgs(argv) {
  const args = {
    _: [],
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (!arg.startsWith('--')) {
      args._.push(arg)
      continue
    }

    const [rawKey, rawValue] = arg.slice(2).split('=')
    const key = rawKey.trim()
    const nextArg = argv[index + 1]
    const value =
      rawValue !== undefined
        ? rawValue
        : nextArg && !nextArg.startsWith('--')
          ? (index += 1, nextArg)
          : true
    args[key] = value
  }

  return args
}

module.exports = {
  ROOT,
  I18N_SOURCE_FILE,
  GENERATED_OVERRIDES_FILE,
  DEFAULT_CATALOG_OUTPUT_DIR,
  ENGLISH_LOCALE,
  normalizeLanguageCode,
  toRosettaLanguageCode,
  parseI18nSource,
  writeJson,
  readJson,
  flattenNestedTextEntries,
  buildNestedTextEntries,
  deepMerge,
  loadGeneratedOverrides,
  buildCombinedCatalog,
  parseArgs,
}

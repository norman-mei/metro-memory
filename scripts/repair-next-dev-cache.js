const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const devRoot = path.join(root, '.next', 'dev')
const documentPath = path.join(devRoot, 'server', 'pages', '_document.js')
const turboRuntimePath = path.join(devRoot, 'server', 'chunks', 'ssr', '[turbopack]_runtime.js')

if (!fs.existsSync(devRoot)) {
  process.exit(0)
}

if (!fs.existsSync(documentPath)) {
  process.exit(0)
}

try {
  const documentSource = fs.readFileSync(documentPath, 'utf8')
  const referencesTurboRuntime = documentSource.includes('[turbopack]_runtime.js')
  const runtimeMissing = !fs.existsSync(turboRuntimePath)

  if (referencesTurboRuntime && runtimeMissing) {
    fs.rmSync(devRoot, { recursive: true, force: true })
    console.log(
      '[repair-next-dev-cache] Cleared .next/dev because Turbopack runtime chunk was missing.',
    )
  }
} catch (error) {
  console.warn(`[repair-next-dev-cache] Skipped cache repair: ${error.message}`)
}

const fs = require('fs')
const path = require('path')
const Module = require('module')
const ts = require('typescript')

if (process.argv.length < 3) {
  console.error('Usage: node scripts/run-ts.js <path-to-typescript-file>')
  process.exit(1)
}

const entryPath = path.resolve(process.cwd(), process.argv[2])

const compileTs = (filename) => {
  const source = fs.readFileSync(filename, 'utf8')
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2019,
      esModuleInterop: true,
      resolveJsonModule: true,
    },
    fileName: filename,
  })
  return outputText
}

const originalResolveFilename = Module._resolveFilename
Module._resolveFilename = function resolveFilename(request, parent, isMain, options) {
  if (typeof request === 'string' && request.startsWith('@/')) {
    request = path.join(process.cwd(), 'src', request.slice(2))
  }
  return originalResolveFilename.call(this, request, parent, isMain, options)
}

require.extensions['.ts'] = function registerTs(module, filename) {
  const outputText = compileTs(filename)
  module._compile(outputText, filename)
}

const compiledModule = new Module(entryPath, module.parent)
compiledModule.filename = entryPath
compiledModule.paths = Module._nodeModulePaths(path.dirname(entryPath))

compiledModule._compile(compileTs(entryPath), entryPath)

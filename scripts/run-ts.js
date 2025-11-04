const fs = require('fs')
const path = require('path')
const Module = require('module')
const ts = require('typescript')

if (process.argv.length < 3) {
  console.error('Usage: node scripts/run-ts.js <path-to-typescript-file>')
  process.exit(1)
}

const entryPath = path.resolve(process.cwd(), process.argv[2])

const source = fs.readFileSync(entryPath, 'utf8')

const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2019,
    esModuleInterop: true,
    resolveJsonModule: true,
  },
})

const compiledModule = new Module(entryPath, module.parent)
compiledModule.filename = entryPath
compiledModule.paths = Module._nodeModulePaths(path.dirname(entryPath))

compiledModule._compile(outputText, entryPath)

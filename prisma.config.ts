import fs from 'node:fs'
import path from 'node:path'
import { defineConfig } from 'prisma/config'

const loadEnvFile = (filePath: string) => {
  if (!fs.existsSync(filePath)) {
    return
  }

  const envFile = fs.readFileSync(filePath, 'utf8')
  for (const rawLine of envFile.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) {
      continue
    }
    const separatorIndex = line.indexOf('=')
    if (separatorIndex <= 0) {
      continue
    }
    const key = line.slice(0, separatorIndex).trim()
    if (!key || process.env[key] !== undefined) {
      continue
    }
    let value = line.slice(separatorIndex + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    process.env[key] = value
  }
}

for (const envFileName of ['.env.development.local', '.env.local', '.env']) {
  loadEnvFile(path.join(process.cwd(), envFileName))
}

const directUrl = process.env.DIRECT_URL?.trim()
const databaseUrl = process.env.DATABASE_URL?.trim()

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // Prefer Neon direct connections for Prisma CLI operations like migrate and db push.
    url: directUrl || databaseUrl || '',
  },
})

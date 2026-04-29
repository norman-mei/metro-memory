import { prisma } from '../src/lib/prisma.ts'
import { getProductionAuthEnvironmentIssues } from '../src/lib/authEnvironment.ts'

async function main() {
  const issues = getProductionAuthEnvironmentIssues()

  try {
    await prisma.$queryRawUnsafe('SELECT 1')
  } catch (error) {
    issues.push(
      `Database connectivity check failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
    )
  } finally {
    await prisma.$disconnect()
  }

  if (issues.length > 0) {
    console.error('[MetroMemory auth env] Invalid configuration detected:')
    for (const issue of issues) {
      console.error(`- ${issue}`)
    }
    process.exit(1)
  }

  console.log('[MetroMemory auth env] Configuration looks production-ready.')
}

await main()

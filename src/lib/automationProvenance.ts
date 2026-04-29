import { AutomationCitationLocatorType, Prisma, PrismaClient } from '@prisma/client'
import { recordCitationsPersisted } from './automationRuntime'

import type { ReviewSource } from '../../scripts/metro-sync/types'

type DbClient = PrismaClient | Prisma.TransactionClient

function mapLocatorType(value: unknown) {
  const text = String(value || '').toUpperCase()
  if (text === AutomationCitationLocatorType.HTML_SELECTOR) return AutomationCitationLocatorType.HTML_SELECTOR
  if (text === AutomationCitationLocatorType.PDF_PAGE) return AutomationCitationLocatorType.PDF_PAGE
  if (text === AutomationCitationLocatorType.OCR_TEXT) return AutomationCitationLocatorType.OCR_TEXT
  return AutomationCitationLocatorType.TEXT
}

export async function persistSourceCitations(input: {
  db: DbClient
  claimId: string
  sources: ReviewSource[]
  artifactIdBySourceUrl?: Map<string, string>
  researchTaskId?: string
}) {
  let persistedCount = 0
  for (const source of input.sources) {
    const metadata =
      source.metadata && typeof source.metadata === 'object'
        ? (source.metadata as Record<string, any>)
        : {}
    const citations = Array.isArray(metadata.citations) ? metadata.citations : []
    if (citations.length === 0) continue

    for (const citation of citations) {
      const sourceUrl =
        typeof citation?.sourceUrl === 'string'
          ? citation.sourceUrl
          : typeof source.url === 'string'
            ? source.url
            : null
      await input.db.automationArtifactCitation.create({
        data: {
          claimId: input.claimId,
          ...(input.researchTaskId ? { researchTaskId: input.researchTaskId } : {}),
          ...(sourceUrl && input.artifactIdBySourceUrl?.get(sourceUrl)
            ? { artifactId: input.artifactIdBySourceUrl.get(sourceUrl)! }
            : {}),
          sourceUrl,
          locatorType: mapLocatorType(citation?.locatorType),
          excerpt: String(citation?.excerpt || source.snippet || '').slice(0, 500),
          excerptHash: String(citation?.excerptHash || ''),
          ...(typeof citation?.pageNumber === 'number' ? { pageNumber: citation.pageNumber } : {}),
          ...(typeof citation?.domSelector === 'string'
            ? { domSelector: citation.domSelector }
            : {}),
          ...(typeof citation?.startOffset === 'number'
            ? { startOffset: citation.startOffset }
            : {}),
          ...(typeof citation?.endOffset === 'number' ? { endOffset: citation.endOffset } : {}),
          ...(typeof citation?.ocrConfidence === 'number'
            ? { ocrConfidence: citation.ocrConfidence }
            : {}),
          metadataJson:
            citation && typeof citation === 'object'
              ? (citation as Prisma.InputJsonValue)
              : Prisma.JsonNull,
        },
      })
        .then(() => {
          persistedCount += 1
        })
        .catch(() => null)
    }
  }

  if (persistedCount > 0) {
    recordCitationsPersisted(persistedCount)
  }

  return persistedCount
}

import { createHash } from 'node:crypto'

import type { CollectedArtifact, EvidenceCitation } from './types'

export function hashExcerpt(excerpt: string) {
  return createHash('sha256').update(excerpt).digest('hex')
}

export function findExcerptOffsets(text: string, excerpt: string) {
  const haystack = String(text || '')
  const needle = String(excerpt || '').trim()
  if (!haystack || !needle) {
    return { startOffset: undefined, endOffset: undefined }
  }

  const start = haystack.indexOf(needle)
  if (start < 0) {
    return { startOffset: undefined, endOffset: undefined }
  }

  return {
    startOffset: start,
    endOffset: start + needle.length,
  }
}

export function buildEvidenceCitation(input: {
  artifact?: CollectedArtifact | null
  excerpt: string
  locatorType?: EvidenceCitation['locatorType']
  pageNumber?: number
  domSelector?: string
  startOffset?: number
  endOffset?: number
  ocrConfidence?: number
  metadata?: Record<string, any>
}) {
  const excerpt = String(input.excerpt || '').replace(/\s+/g, ' ').trim().slice(0, 500)
  return {
    sourceUrl: input.artifact?.sourceUrl,
    artifactType: input.artifact?.artifactType,
    locatorType: input.locatorType || 'TEXT',
    excerpt,
    excerptHash: hashExcerpt(excerpt),
    ...(typeof input.pageNumber === 'number' ? { pageNumber: input.pageNumber } : {}),
    ...(input.domSelector ? { domSelector: input.domSelector } : {}),
    ...(typeof input.startOffset === 'number' ? { startOffset: input.startOffset } : {}),
    ...(typeof input.endOffset === 'number' ? { endOffset: input.endOffset } : {}),
    ...(typeof input.ocrConfidence === 'number' ? { ocrConfidence: input.ocrConfidence } : {}),
    ...(input.metadata ? { metadata: input.metadata } : {}),
  } satisfies EvidenceCitation
}

export function appendCitationMetadata(
  metadata: Record<string, any> | undefined,
  citations: EvidenceCitation[],
) {
  return {
    ...(metadata || {}),
    citations,
  }
}

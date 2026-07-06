// Serialized DTOs passed from the server page to the client workspace.

export type EvidenceDTO = {
  id: string
  sourceUrl: string
  sourceTitle: string | null
  sourceDate: string | null
  excerpt: string | null
  tier: number
}

export type ClaimDTO = {
  id: string
  citySlug: string
  claimType: string
  title: string
  summary: string | null
  confidence: number | null
  lane: 'GREEN' | 'YELLOW' | 'RED'
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'APPLIED'
  reviewNotes: string | null
  createdAt: string
  evidence: EvidenceDTO[]
}

export type RunDTO = {
  id: string
  trigger: string
  status: string
  citySlugs: string[]
  createdAt: string
  finishedAt: string | null
  summary: Record<string, unknown> | null
}

export type QueueMetricsDTO = {
  pending: { green: number; yellow: number; red: number }
  totals: { pending: number; approved: number; rejected: number; applied: number }
}

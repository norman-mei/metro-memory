export type LineSpec = {
  id: string
  name: string
  keywords: string[]
  color?: string
  icon?: string
  order?: number
}

export type Registry = {
  city: string
  continent?: string
  bbox: [number, number, number, number]
  localLanguages?: string[]
  modes?: string[]
  lines: LineSpec[]
  stationAliases?: Record<string, string>
  stationLocalNames?: Record<string, string[]>
  manualCoords?: Record<string, [number, number][]>
  autoConfig?: boolean
  automation?: {
    researchTier?: 'tier1' | 'tier2' | 'tier3'
    cadenceMonths?: 1 | 3 | 6
    batchSlot?: number
    alwaysDeepResearch?: boolean
  }
  sources?: {
    gtfsFeeds?: string[]
    officialPages?: string[]
    pressPages?: string[]
    mapPdfs?: string[]
  }
}

export type ReviewSource = {
  sourceType: string
  label?: string
  url?: string
  snippet?: string
  metadata?: Record<string, any>
}

export type EvidenceCitation = {
  sourceUrl?: string
  artifactType?: CollectedArtifactType
  locatorType?: 'TEXT' | 'HTML_SELECTOR' | 'PDF_PAGE' | 'OCR_TEXT'
  excerpt: string
  excerptHash: string
  pageNumber?: number
  domSelector?: string
  startOffset?: number
  endOffset?: number
  ocrConfidence?: number
  metadata?: Record<string, any>
}

export type ResearchDiscoveryMode = 'registry-only' | 'official-first'

export type ResearchTaskType =
  | 'FIND_OFFICIAL_OPERATOR_PAGE'
  | 'FIND_MAP_PDF'
  | 'FIND_GTFS_FEED'
  | 'FIND_PRESS_PAGE'
  | 'VERIFY_STATION_RENAME'
  | 'VERIFY_LINE_RENAME'
  | 'VERIFY_LINE_COLOR'
  | 'VERIFY_OPERATOR'
  | 'VERIFY_METADATA'

export type ResearchTaskStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'SATISFIED'
  | 'BLOCKED'
  | 'FAILED'
  | 'EXHAUSTED'

export type ResearchTaskRequest = {
  taskType: ResearchTaskType
  title: string
  citySlug: string
  claimType?: ReviewCandidateType
  candidateTitle?: string
  entityKey?: string
  queryHint?: string
  expectedArtifactTypes?: CollectedArtifactType[]
  metadata?: Record<string, any>
}

export type ResearchTaskCollectionResult = {
  taskType: ResearchTaskType
  title: string
  artifactCount: number
  discoveredCount: number
  fetchErrorCount: number
  retryableFailure: boolean
  exhaustedByPolicy: boolean
  fetchedUrls: string[]
  failedUrls: string[]
  preferredDomains?: string[]
  memoryInfluenced?: boolean
}

export type EvidenceGraphSummary = {
  nodeCount: number
  edgeCount: number
  supportCount: number
  contradictionCount: number
  missingEvidence: string[]
  nextBestAction: string | null
  topSupportingSources: Array<{
    sourceType: string
    label?: string
    url?: string
    domain?: string | null
  }>
  contradictionReasons: string[]
  recommendedTaskTypes: ResearchTaskType[]
}

export type ResearchPlannerOutput = {
  followUpRecommended: boolean
  missingEvidence: string[]
  nextBestAction: string | null
  recommendedTaskTypes: ResearchTaskType[]
  tasks: ResearchTaskRequest[]
  plannerReason?: string | null
  citations?: EvidenceCitation[]
}

export type ReviewCandidateType =
  | 'NEW_STATION'
  | 'REMOVED_STATION'
  | 'UPDATED_STATION'
  | 'NEW_LINE'
  | 'LINE_RENAME_CANDIDATE'
  | 'LINE_COLOR_CANDIDATE'
  | 'OPERATOR_SUGGESTION'
  | 'HEADER_SUGGESTION'
  | 'IMAGE_CANDIDATE'
  | 'METADATA_CANDIDATE'
  | 'OPERATOR_METADATA_CANDIDATE'

export type ReviewCandidate = {
  citySlug: string
  type: ReviewCandidateType
  entityKey?: string
  title: string
  summary?: string
  confidence?: number
  beforeValue?: any
  afterValue?: any
  diff?: any
  metadata?: any
  sources: ReviewSource[]
}

export type SourceEnrichmentSuggestion = {
  sourceKey: 'gtfsFeeds' | 'officialPages' | 'pressPages' | 'mapPdfs'
  url: string
  confidence: number
  reason: string
  artifactType?: CollectedArtifactType
}

export type RichLineProposal = {
  id: string
  name: string
  keywords: string[]
  color: string
  backgroundColor: string
  textColor: string
  progressOutlineColor: string
  order: number
  icon?: string
  iconCandidatePublicPath?: string
  iconCandidateRepoPath?: string
  iconCandidateSourceUrl?: string
  extractedColor?: string
  sourceName?: string
  operator?: string
  network?: string
  routeSample?: Record<string, any>
}

export type ReportCity = {
  city: string
  linesProcessed: number
  lineErrors: string[]
  newStations: string[]
  removedStations: string[]
  updatedStations: string[]
  newLines: string[]
  operatorSuggestion?: {
    value: string
    verified: boolean
    source: string
    sources: ReviewSource[]
  }
  headerSuggestion?: {
    header: string
    subheader?: string
    verified: boolean
    source: string
    sources: ReviewSource[]
  }
  colorWarnings: string[]
  verificationNotes: string[]
  candidates: ReviewCandidate[]
  richLineProposals: RichLineProposal[]
  sourceEnrichmentSuggestions?: SourceEnrichmentSuggestion[]
  clusteredDuplicateCount?: number
}

export type Report = {
  startedAt: string
  finishedAt?: string
  cities: ReportCity[]
  errors: string[]
}

export type StationFeature = {
  type: 'Feature'
  geometry: {
    type: 'Point'
    coordinates: any
  }
  properties: {
    name: string
    line: string
    order: number
    id?: number | string
    alternate_names?: string[]
  }
  id?: number | string
}

export type CollectedArtifactType =
  | 'OSM_OVERPASS'
  | 'SEARCH_RESULT'
  | 'IMAGE_PREVIEW'
  | 'REPORT_MARKDOWN'
  | 'GTFS_FEED'
  | 'OFFICIAL_PAGE'
  | 'PRESS_RELEASE'
  | 'MAP_PDF'

export type CollectedArtifact = {
  citySlug?: string
  artifactType: CollectedArtifactType
  sourceUrl?: string
  sourceDomain?: string
  mimeType?: string
  localPath?: string
  contentHash?: string
  fetchedAt?: string
  metadataJson?: Record<string, any>
}

export type ExtractedArtifactFact = {
  citySlug: string
  artifactType: CollectedArtifactType
  sourceUrl?: string
  sourceDomain?: string
  kind:
    | 'LINE_REFERENCE'
    | 'LINE_COLOR_REFERENCE'
    | 'LINE_RENAME_REFERENCE'
    | 'STATION_REFERENCE'
    | 'OPENING_REFERENCE'
    | 'EXTENSION_REFERENCE'
    | 'OPERATOR_REFERENCE'
    | 'OPERATOR_METADATA_REFERENCE'
    | 'MAP_REFERENCE'
    | 'DATASET_REFERENCE'
    | 'CONFLICT_REFERENCE'
  label: string
  snippet: string
  lineName?: string
  confidence: number
  metadata?: Record<string, any>
}

export type GroundedFactExtractionResult = {
  facts: ExtractedArtifactFact[]
  citations: EvidenceCitation[]
  provider?: string | null
  model?: string | null
}

export type GroundedVerificationResult = {
  contradictionFlag?: boolean
  contradictionReasons?: string[]
  confidenceAdjustment?: number
  missingEvidence?: string[]
  nextBestAction?: string | null
  recommendedTaskTypes?: ResearchTaskType[]
  supportScore?: number
  plannerReason?: string | null
  citations?: EvidenceCitation[]
  raw?: Record<string, any>
}

export type CollectedCityInputs = {
  overpassData: any
  lineFeatures: any[]
  stationFeatures: any[]
  artifacts: CollectedArtifact[]
  extractedFacts: ExtractedArtifactFact[]
  researchTaskResults?: ResearchTaskCollectionResult[]
}

export type VerificationArtifactResult = {
  notes: string[]
  artifacts: CollectedArtifact[]
}

export type ConfigMetadata = {
  title: string | null
  description: string | null
  openGraphTitle: string | null
  openGraphDescription: string | null
}

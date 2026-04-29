CREATE TYPE "AutomationAgentSessionType" AS ENUM (
  'CHAT',
  'TARGETED_RUN',
  'MANUAL_UPDATE'
);

CREATE TYPE "AutomationAgentMessageRole" AS ENUM (
  'USER',
  'ASSISTANT',
  'SYSTEM',
  'TOOL'
);

CREATE TYPE "AutomationRunRequestMode" AS ENUM (
  'SCHEDULED',
  'TARGETED_RESEARCH',
  'MANUAL_UPDATE',
  'FOLLOW_UP',
  'EXPLAIN'
);

CREATE TYPE "AutomationRunRequestStatus" AS ENUM (
  'DRAFT',
  'QUEUED',
  'RUNNING',
  'COMPLETED',
  'FAILED',
  'CANCELED'
);

CREATE TYPE "AutomationApplyPolicy" AS ENUM (
  'REVIEW_ONLY',
  'AUTO_APPLY_GREEN_ONLY'
);

CREATE TYPE "AutomationResearchMemoryKind" AS ENUM (
  'CITY_ALIAS',
  'OPERATOR_SOURCE',
  'DOMAIN_RECIPE',
  'HISTORICAL_FACT'
);

CREATE TYPE "AutomationCitationLocatorType" AS ENUM (
  'TEXT',
  'HTML_SELECTOR',
  'PDF_PAGE',
  'OCR_TEXT'
);

CREATE TABLE "AutomationAgentSession" (
  "id" TEXT NOT NULL,
  "sessionType" "AutomationAgentSessionType" NOT NULL DEFAULT 'CHAT',
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "title" TEXT,
  "summary" TEXT,
  "createdBy" TEXT,
  "contextJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AutomationAgentSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AutomationAgentMessage" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "role" "AutomationAgentMessageRole" NOT NULL,
  "content" TEXT NOT NULL,
  "structuredJson" JSONB,
  "citationsJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AutomationAgentMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AutomationRunRequest" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT,
  "requestedBy" TEXT,
  "mode" "AutomationRunRequestMode" NOT NULL,
  "scope" TEXT,
  "citySlugsJson" JSONB,
  "claimTypesJson" JSONB,
  "applyPolicy" "AutomationApplyPolicy" NOT NULL DEFAULT 'REVIEW_ONLY',
  "status" "AutomationRunRequestStatus" NOT NULL DEFAULT 'DRAFT',
  "prompt" TEXT,
  "contextJson" JSONB,
  "createdRunId" TEXT,
  "errorMessage" TEXT,
  "startedAt" TIMESTAMP(3),
  "finishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AutomationRunRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AutomationResearchMemory" (
  "id" TEXT NOT NULL,
  "kind" "AutomationResearchMemoryKind" NOT NULL,
  "key" TEXT NOT NULL,
  "citySlug" TEXT,
  "operatorKey" TEXT,
  "domain" TEXT,
  "valueJson" JSONB,
  "trustScore" DOUBLE PRECISION,
  "lastSeenAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AutomationResearchMemory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AutomationArtifactCitation" (
  "id" TEXT NOT NULL,
  "artifactId" TEXT,
  "claimId" TEXT,
  "researchTaskId" TEXT,
  "sourceUrl" TEXT,
  "locatorType" "AutomationCitationLocatorType" NOT NULL DEFAULT 'TEXT',
  "excerpt" TEXT NOT NULL,
  "excerptHash" TEXT NOT NULL,
  "pageNumber" INTEGER,
  "domSelector" TEXT,
  "startOffset" INTEGER,
  "endOffset" INTEGER,
  "ocrConfidence" DOUBLE PRECISION,
  "metadataJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AutomationArtifactCitation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AutomationEvalRun" (
  "id" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "requestedBy" TEXT,
  "inputJson" JSONB,
  "summaryJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AutomationEvalRun_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AutomationAgentSession_createdAt_idx" ON "AutomationAgentSession"("createdAt");
CREATE INDEX "AutomationAgentMessage_sessionId_createdAt_idx" ON "AutomationAgentMessage"("sessionId", "createdAt");
CREATE INDEX "AutomationRunRequest_status_createdAt_idx" ON "AutomationRunRequest"("status", "createdAt");
CREATE INDEX "AutomationRunRequest_mode_createdAt_idx" ON "AutomationRunRequest"("mode", "createdAt");
CREATE UNIQUE INDEX "AutomationResearchMemory_kind_key_key" ON "AutomationResearchMemory"("kind", "key");
CREATE INDEX "AutomationResearchMemory_citySlug_kind_idx" ON "AutomationResearchMemory"("citySlug", "kind");
CREATE INDEX "AutomationResearchMemory_domain_kind_idx" ON "AutomationResearchMemory"("domain", "kind");
CREATE INDEX "AutomationArtifactCitation_artifactId_idx" ON "AutomationArtifactCitation"("artifactId");
CREATE INDEX "AutomationArtifactCitation_claimId_idx" ON "AutomationArtifactCitation"("claimId");
CREATE INDEX "AutomationArtifactCitation_researchTaskId_idx" ON "AutomationArtifactCitation"("researchTaskId");
CREATE INDEX "AutomationArtifactCitation_excerptHash_idx" ON "AutomationArtifactCitation"("excerptHash");
CREATE INDEX "AutomationEvalRun_createdAt_idx" ON "AutomationEvalRun"("createdAt");

ALTER TABLE "AutomationAgentMessage"
  ADD CONSTRAINT "AutomationAgentMessage_sessionId_fkey"
  FOREIGN KEY ("sessionId") REFERENCES "AutomationAgentSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AutomationRunRequest"
  ADD CONSTRAINT "AutomationRunRequest_sessionId_fkey"
  FOREIGN KEY ("sessionId") REFERENCES "AutomationAgentSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AutomationArtifactCitation"
  ADD CONSTRAINT "AutomationArtifactCitation_artifactId_fkey"
  FOREIGN KEY ("artifactId") REFERENCES "AutomationArtifact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AutomationArtifactCitation"
  ADD CONSTRAINT "AutomationArtifactCitation_claimId_fkey"
  FOREIGN KEY ("claimId") REFERENCES "AutomationClaim"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AutomationArtifactCitation"
  ADD CONSTRAINT "AutomationArtifactCitation_researchTaskId_fkey"
  FOREIGN KEY ("researchTaskId") REFERENCES "AutomationResearchTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

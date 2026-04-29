CREATE TYPE "AutomationResearchRunStatus" AS ENUM (
  'PENDING',
  'RUNNING',
  'COMPLETED',
  'FAILED',
  'BLOCKED',
  'EXHAUSTED'
);

CREATE TYPE "AutomationResearchTaskStatus" AS ENUM (
  'PENDING',
  'RUNNING',
  'SATISFIED',
  'BLOCKED',
  'FAILED',
  'EXHAUSTED'
);

CREATE TYPE "AutomationResearchTaskType" AS ENUM (
  'FIND_OFFICIAL_OPERATOR_PAGE',
  'FIND_MAP_PDF',
  'FIND_GTFS_FEED',
  'FIND_PRESS_PAGE',
  'VERIFY_STATION_RENAME',
  'VERIFY_LINE_RENAME',
  'VERIFY_LINE_COLOR',
  'VERIFY_OPERATOR',
  'VERIFY_METADATA'
);

CREATE TYPE "AutomationEvidenceNodeType" AS ENUM (
  'CLAIM',
  'ARTIFACT',
  'FACT',
  'TASK'
);

CREATE TYPE "AutomationEvidenceEdgeType" AS ENUM (
  'SUPPORTS',
  'CONTRADICTS',
  'DERIVES',
  'REQUESTED_BY',
  'SATISFIES',
  'SUPERSEDES'
);

CREATE TABLE "AutomationResearchRun" (
  "id" TEXT NOT NULL,
  "parentRunId" TEXT NOT NULL,
  "claimId" TEXT,
  "citySlug" TEXT NOT NULL,
  "status" "AutomationResearchRunStatus" NOT NULL DEFAULT 'PENDING',
  "attemptNumber" INTEGER NOT NULL DEFAULT 1,
  "triggerReason" TEXT NOT NULL,
  "summary" JSONB,
  "errorLog" JSONB,
  "nextAttemptAt" TIMESTAMP(3),
  "startedAt" TIMESTAMP(3),
  "finishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AutomationResearchRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AutomationResearchTask" (
  "id" TEXT NOT NULL,
  "researchRunId" TEXT NOT NULL,
  "claimId" TEXT,
  "citySlug" TEXT NOT NULL,
  "taskType" "AutomationResearchTaskType" NOT NULL,
  "status" "AutomationResearchTaskStatus" NOT NULL DEFAULT 'PENDING',
  "priority" INTEGER NOT NULL DEFAULT 0,
  "retryCount" INTEGER NOT NULL DEFAULT 0,
  "satisfied" BOOLEAN NOT NULL DEFAULT false,
  "goalJson" JSONB,
  "resultJson" JSONB,
  "blockedReason" TEXT,
  "nextActionHint" TEXT,
  "nextAttemptAt" TIMESTAMP(3),
  "lastAttemptAt" TIMESTAMP(3),
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AutomationResearchTask_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AutomationResearchTaskArtifact" (
  "id" TEXT NOT NULL,
  "researchTaskId" TEXT NOT NULL,
  "artifactId" TEXT NOT NULL,

  CONSTRAINT "AutomationResearchTaskArtifact_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AutomationEvidenceNode" (
  "id" TEXT NOT NULL,
  "claimId" TEXT NOT NULL,
  "researchTaskId" TEXT,
  "nodeType" "AutomationEvidenceNodeType" NOT NULL,
  "referenceKey" TEXT,
  "summaryJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AutomationEvidenceNode_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AutomationEvidenceEdge" (
  "id" TEXT NOT NULL,
  "claimId" TEXT NOT NULL,
  "fromNodeId" TEXT NOT NULL,
  "toNodeId" TEXT NOT NULL,
  "edgeType" "AutomationEvidenceEdgeType" NOT NULL,
  "weight" DOUBLE PRECISION,
  "notesJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AutomationEvidenceEdge_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AutomationResearchRun_parentRunId_citySlug_idx" ON "AutomationResearchRun"("parentRunId", "citySlug");
CREATE INDEX "AutomationResearchRun_claimId_createdAt_idx" ON "AutomationResearchRun"("claimId", "createdAt");
CREATE INDEX "AutomationResearchTask_researchRunId_status_idx" ON "AutomationResearchTask"("researchRunId", "status");
CREATE INDEX "AutomationResearchTask_claimId_status_idx" ON "AutomationResearchTask"("claimId", "status");
CREATE UNIQUE INDEX "AutomationResearchTaskArtifact_researchTaskId_artifactId_key" ON "AutomationResearchTaskArtifact"("researchTaskId", "artifactId");
CREATE INDEX "AutomationResearchTaskArtifact_artifactId_idx" ON "AutomationResearchTaskArtifact"("artifactId");
CREATE INDEX "AutomationEvidenceNode_claimId_nodeType_idx" ON "AutomationEvidenceNode"("claimId", "nodeType");
CREATE INDEX "AutomationEvidenceNode_researchTaskId_idx" ON "AutomationEvidenceNode"("researchTaskId");
CREATE INDEX "AutomationEvidenceEdge_claimId_edgeType_idx" ON "AutomationEvidenceEdge"("claimId", "edgeType");
CREATE INDEX "AutomationEvidenceEdge_fromNodeId_idx" ON "AutomationEvidenceEdge"("fromNodeId");
CREATE INDEX "AutomationEvidenceEdge_toNodeId_idx" ON "AutomationEvidenceEdge"("toNodeId");

ALTER TABLE "AutomationResearchRun"
  ADD CONSTRAINT "AutomationResearchRun_parentRunId_fkey"
  FOREIGN KEY ("parentRunId") REFERENCES "AutomationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AutomationResearchRun"
  ADD CONSTRAINT "AutomationResearchRun_claimId_fkey"
  FOREIGN KEY ("claimId") REFERENCES "AutomationClaim"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AutomationResearchTask"
  ADD CONSTRAINT "AutomationResearchTask_researchRunId_fkey"
  FOREIGN KEY ("researchRunId") REFERENCES "AutomationResearchRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AutomationResearchTask"
  ADD CONSTRAINT "AutomationResearchTask_claimId_fkey"
  FOREIGN KEY ("claimId") REFERENCES "AutomationClaim"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AutomationResearchTaskArtifact"
  ADD CONSTRAINT "AutomationResearchTaskArtifact_researchTaskId_fkey"
  FOREIGN KEY ("researchTaskId") REFERENCES "AutomationResearchTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AutomationResearchTaskArtifact"
  ADD CONSTRAINT "AutomationResearchTaskArtifact_artifactId_fkey"
  FOREIGN KEY ("artifactId") REFERENCES "AutomationArtifact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AutomationEvidenceNode"
  ADD CONSTRAINT "AutomationEvidenceNode_claimId_fkey"
  FOREIGN KEY ("claimId") REFERENCES "AutomationClaim"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AutomationEvidenceNode"
  ADD CONSTRAINT "AutomationEvidenceNode_researchTaskId_fkey"
  FOREIGN KEY ("researchTaskId") REFERENCES "AutomationResearchTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AutomationEvidenceEdge"
  ADD CONSTRAINT "AutomationEvidenceEdge_claimId_fkey"
  FOREIGN KEY ("claimId") REFERENCES "AutomationClaim"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AutomationEvidenceEdge"
  ADD CONSTRAINT "AutomationEvidenceEdge_fromNodeId_fkey"
  FOREIGN KEY ("fromNodeId") REFERENCES "AutomationEvidenceNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AutomationEvidenceEdge"
  ADD CONSTRAINT "AutomationEvidenceEdge_toNodeId_fkey"
  FOREIGN KEY ("toNodeId") REFERENCES "AutomationEvidenceNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

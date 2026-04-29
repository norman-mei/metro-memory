-- CreateTable
CREATE TABLE "AutomationRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "source" TEXT NOT NULL DEFAULT 'metro-sync',
    "scope" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
    "startedAt" DATETIME NOT NULL,
    "finishedAt" DATETIME,
    "reportMarkdown" TEXT,
    "summary" JSONB,
    "errorLog" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AutomationCandidate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runId" TEXT NOT NULL,
    "citySlug" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "entityKey" TEXT,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "confidence" REAL,
    "beforeValue" JSONB,
    "afterValue" JSONB,
    "diff" JSONB,
    "metadata" JSONB,
    "reviewedAt" DATETIME,
    "reviewedBy" TEXT,
    "reviewNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AutomationCandidate_runId_fkey" FOREIGN KEY ("runId") REFERENCES "AutomationRun" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AutomationSource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "candidateId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "label" TEXT,
    "url" TEXT,
    "snippet" TEXT,
    "metadata" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AutomationSource_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "AutomationCandidate" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AutomationDecision" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "candidateId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "note" TEXT,
    "reviewer" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AutomationDecision_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "AutomationCandidate" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "AutomationCandidate_runId_citySlug_idx" ON "AutomationCandidate"("runId", "citySlug");

-- CreateIndex
CREATE INDEX "AutomationCandidate_status_citySlug_idx" ON "AutomationCandidate"("status", "citySlug");

-- CreateIndex
CREATE INDEX "AutomationCandidate_type_citySlug_idx" ON "AutomationCandidate"("type", "citySlug");

-- CreateIndex
CREATE INDEX "AutomationSource_candidateId_idx" ON "AutomationSource"("candidateId");

-- CreateIndex
CREATE INDEX "AutomationDecision_candidateId_createdAt_idx" ON "AutomationDecision"("candidateId", "createdAt");

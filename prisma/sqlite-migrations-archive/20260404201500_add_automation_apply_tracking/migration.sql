-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AutomationRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "source" TEXT NOT NULL DEFAULT 'metro-sync',
    "scope" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
    "startedAt" DATETIME NOT NULL,
    "finishedAt" DATETIME,
    "appliedAt" DATETIME,
    "appliedBy" TEXT,
    "appliedRef" TEXT,
    "reportMarkdown" TEXT,
    "summary" JSONB,
    "errorLog" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_AutomationRun" ("createdAt", "errorLog", "finishedAt", "id", "reportMarkdown", "scope", "source", "startedAt", "status", "summary", "updatedAt") SELECT "createdAt", "errorLog", "finishedAt", "id", "reportMarkdown", "scope", "source", "startedAt", "status", "summary", "updatedAt" FROM "AutomationRun";
DROP TABLE "AutomationRun";
ALTER TABLE "new_AutomationRun" RENAME TO "AutomationRun";

CREATE TABLE "new_AutomationCandidate" (
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
    "appliedAt" DATETIME,
    "appliedBy" TEXT,
    "appliedRef" TEXT,
    "applyNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AutomationCandidate_runId_fkey" FOREIGN KEY ("runId") REFERENCES "AutomationRun" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_AutomationCandidate" ("beforeValue", "citySlug", "confidence", "createdAt", "diff", "entityKey", "id", "metadata", "reviewNote", "reviewedAt", "reviewedBy", "runId", "status", "summary", "title", "type", "updatedAt", "afterValue") SELECT "beforeValue", "citySlug", "confidence", "createdAt", "diff", "entityKey", "id", "metadata", "reviewNote", "reviewedAt", "reviewedBy", "runId", "status", "summary", "title", "type", "updatedAt", "afterValue" FROM "AutomationCandidate";
DROP TABLE "AutomationCandidate";
ALTER TABLE "new_AutomationCandidate" RENAME TO "AutomationCandidate";
CREATE INDEX "AutomationCandidate_runId_citySlug_idx" ON "AutomationCandidate"("runId", "citySlug");
CREATE INDEX "AutomationCandidate_status_citySlug_idx" ON "AutomationCandidate"("status", "citySlug");
CREATE INDEX "AutomationCandidate_type_citySlug_idx" ON "AutomationCandidate"("type", "citySlug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

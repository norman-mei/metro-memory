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
    "branchName" TEXT,
    "commitSha" TEXT,
    "pullRequestUrl" TEXT,
    "pullRequestNumber" INTEGER,
    "revertedAt" DATETIME,
    "revertedBy" TEXT,
    "revertRef" TEXT,
    "revertBranchName" TEXT,
    "revertCommitSha" TEXT,
    "revertPullRequestUrl" TEXT,
    "revertPullRequestNumber" INTEGER,
    "reportMarkdown" TEXT,
    "summary" JSONB,
    "errorLog" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_AutomationRun" ("appliedAt", "appliedBy", "appliedRef", "createdAt", "errorLog", "finishedAt", "id", "reportMarkdown", "scope", "source", "startedAt", "status", "summary", "updatedAt") SELECT "appliedAt", "appliedBy", "appliedRef", "createdAt", "errorLog", "finishedAt", "id", "reportMarkdown", "scope", "source", "startedAt", "status", "summary", "updatedAt" FROM "AutomationRun";
DROP TABLE "AutomationRun";
ALTER TABLE "new_AutomationRun" RENAME TO "AutomationRun";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

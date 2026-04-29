CREATE TABLE "AutomationPolicyMetric" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scope" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "reviewedCount" INTEGER NOT NULL DEFAULT 0,
    "approvedCount" INTEGER NOT NULL DEFAULT 0,
    "rejectedCount" INTEGER NOT NULL DEFAULT 0,
    "appliedCount" INTEGER NOT NULL DEFAULT 0,
    "revertedCount" INTEGER NOT NULL DEFAULT 0,
    "approvalRate" REAL,
    "rejectionRate" REAL,
    "revertRate" REAL,
    "trustScore" REAL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX "AutomationPolicyMetric_scope_key_key" ON "AutomationPolicyMetric"("scope", "key");
CREATE INDEX "AutomationPolicyMetric_scope_trustScore_idx" ON "AutomationPolicyMetric"("scope", "trustScore");

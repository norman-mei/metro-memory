-- CreateTable
CREATE TABLE "AutomationArtifact" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runId" TEXT NOT NULL,
    "citySlug" TEXT,
    "artifactType" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "sourceDomain" TEXT,
    "mimeType" TEXT,
    "localPath" TEXT,
    "contentHash" TEXT,
    "fetchedAt" DATETIME,
    "metadataJson" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AutomationArtifact_runId_fkey" FOREIGN KEY ("runId") REFERENCES "AutomationRun" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AutomationClaim" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runId" TEXT NOT NULL,
    "citySlug" TEXT NOT NULL,
    "claimType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "beforeValueJson" JSONB,
    "afterValueJson" JSONB,
    "reason" TEXT,
    "confidence" REAL,
    "lane" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
    "autoApplyEligible" BOOLEAN NOT NULL DEFAULT false,
    "verificationNotes" JSONB,
    "metadataJson" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AutomationClaim_runId_fkey" FOREIGN KEY ("runId") REFERENCES "AutomationRun" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AutomationClaimArtifact" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "claimId" TEXT NOT NULL,
    "artifactId" TEXT NOT NULL,
    CONSTRAINT "AutomationClaimArtifact_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "AutomationClaim" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AutomationClaimArtifact_artifactId_fkey" FOREIGN KEY ("artifactId") REFERENCES "AutomationArtifact" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AutomationVerification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "claimId" TEXT NOT NULL,
    "sourceTierScore" REAL,
    "evidenceCount" INTEGER NOT NULL DEFAULT 0,
    "recencyScore" REAL,
    "consistencyScore" REAL,
    "contradictionFlag" BOOLEAN NOT NULL DEFAULT false,
    "verifierVersion" TEXT,
    "verificationJson" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AutomationVerification_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "AutomationClaim" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AutomationPolicyDecision" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "claimId" TEXT NOT NULL,
    "lane" TEXT NOT NULL,
    "decisionReason" TEXT NOT NULL,
    "autoApplyAllowed" BOOLEAN NOT NULL DEFAULT false,
    "policyVersion" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AutomationPolicyDecision_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "AutomationClaim" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AutomationSourceDomain" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "domain" TEXT NOT NULL,
    "tier" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "trustScore" REAL,
    "blocked" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "lastSeenAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "AutomationArtifact_runId_citySlug_idx" ON "AutomationArtifact"("runId", "citySlug");

-- CreateIndex
CREATE INDEX "AutomationArtifact_artifactType_citySlug_idx" ON "AutomationArtifact"("artifactType", "citySlug");

-- CreateIndex
CREATE INDEX "AutomationClaim_runId_citySlug_idx" ON "AutomationClaim"("runId", "citySlug");

-- CreateIndex
CREATE INDEX "AutomationClaim_lane_citySlug_idx" ON "AutomationClaim"("lane", "citySlug");

-- CreateIndex
CREATE INDEX "AutomationClaimArtifact_artifactId_idx" ON "AutomationClaimArtifact"("artifactId");

-- CreateIndex
CREATE UNIQUE INDEX "AutomationClaimArtifact_claimId_artifactId_key" ON "AutomationClaimArtifact"("claimId", "artifactId");

-- CreateIndex
CREATE INDEX "AutomationVerification_claimId_createdAt_idx" ON "AutomationVerification"("claimId", "createdAt");

-- CreateIndex
CREATE INDEX "AutomationPolicyDecision_claimId_createdAt_idx" ON "AutomationPolicyDecision"("claimId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AutomationSourceDomain_domain_key" ON "AutomationSourceDomain"("domain");

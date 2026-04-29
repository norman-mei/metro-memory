-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "VerificationType" AS ENUM ('EMAIL');

-- CreateEnum
CREATE TYPE "AutomationRunStatus" AS ENUM ('PENDING_REVIEW', 'PARTIALLY_REVIEWED', 'REVIEWED', 'PARTIALLY_APPLIED', 'APPLIED', 'FAILED');

-- CreateEnum
CREATE TYPE "AutomationCandidateType" AS ENUM ('NEW_STATION', 'REMOVED_STATION', 'UPDATED_STATION', 'NEW_LINE', 'LINE_RENAME_CANDIDATE', 'LINE_COLOR_CANDIDATE', 'OPERATOR_SUGGESTION', 'HEADER_SUGGESTION', 'IMAGE_CANDIDATE', 'METADATA_CANDIDATE', 'OPERATOR_METADATA_CANDIDATE');

-- CreateEnum
CREATE TYPE "AutomationDecisionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "AutomationLane" AS ENUM ('GREEN', 'YELLOW', 'RED');

-- CreateEnum
CREATE TYPE "AutomationClaimStatus" AS ENUM ('PENDING_REVIEW', 'APPROVED', 'REJECTED', 'APPLIED', 'SKIPPED', 'FAILED');

-- CreateEnum
CREATE TYPE "AutomationArtifactType" AS ENUM ('OSM_OVERPASS', 'SEARCH_RESULT', 'IMAGE_PREVIEW', 'REPORT_MARKDOWN', 'GTFS_FEED', 'OFFICIAL_PAGE', 'PRESS_RELEASE', 'MAP_PDF');

-- CreateEnum
CREATE TYPE "AutomationSourceTier" AS ENUM ('OFFICIAL', 'ESTABLISHED', 'COMMUNITY', 'UNKNOWN', 'BLOCKED');

-- CreateEnum
CREATE TYPE "AutomationMetricScope" AS ENUM ('DOMAIN', 'CITY', 'CLAIM_TYPE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "pendingEmail" TEXT,
    "passwordHash" TEXT NOT NULL,
    "emailVerifiedAt" TIMESTAMP(3),
    "adFree" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "uiPreferences" JSONB,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "type" "VerificationType" NOT NULL DEFAULT 'EMAIL',
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerificationToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaptchaChallenge" (
    "id" TEXT NOT NULL,
    "answerHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CaptchaChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Progress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "citySlug" TEXT NOT NULL,
    "foundIds" JSONB NOT NULL,
    "foundTimestamps" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationRun" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'metro-sync',
    "scope" TEXT,
    "status" "AutomationRunStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "startedAt" TIMESTAMP(3) NOT NULL,
    "finishedAt" TIMESTAMP(3),
    "appliedAt" TIMESTAMP(3),
    "appliedBy" TEXT,
    "appliedRef" TEXT,
    "branchName" TEXT,
    "commitSha" TEXT,
    "pullRequestUrl" TEXT,
    "pullRequestNumber" INTEGER,
    "revertedAt" TIMESTAMP(3),
    "revertedBy" TEXT,
    "revertRef" TEXT,
    "revertBranchName" TEXT,
    "revertCommitSha" TEXT,
    "revertPullRequestUrl" TEXT,
    "revertPullRequestNumber" INTEGER,
    "reportMarkdown" TEXT,
    "summary" JSONB,
    "errorLog" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutomationRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationCandidate" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "citySlug" TEXT NOT NULL,
    "type" "AutomationCandidateType" NOT NULL,
    "status" "AutomationDecisionStatus" NOT NULL DEFAULT 'PENDING',
    "entityKey" TEXT,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "confidence" DOUBLE PRECISION,
    "beforeValue" JSONB,
    "afterValue" JSONB,
    "diff" JSONB,
    "metadata" JSONB,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "reviewNote" TEXT,
    "appliedAt" TIMESTAMP(3),
    "appliedBy" TEXT,
    "appliedRef" TEXT,
    "applyNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutomationCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationSource" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "label" TEXT,
    "url" TEXT,
    "snippet" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AutomationSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationDecision" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "status" "AutomationDecisionStatus" NOT NULL,
    "note" TEXT,
    "reviewer" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AutomationDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationArtifact" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "citySlug" TEXT,
    "artifactType" "AutomationArtifactType" NOT NULL,
    "sourceUrl" TEXT,
    "sourceDomain" TEXT,
    "mimeType" TEXT,
    "localPath" TEXT,
    "contentHash" TEXT,
    "fetchedAt" TIMESTAMP(3),
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AutomationArtifact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationClaim" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "candidateId" TEXT,
    "citySlug" TEXT NOT NULL,
    "claimType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "beforeValueJson" JSONB,
    "afterValueJson" JSONB,
    "reason" TEXT,
    "confidence" DOUBLE PRECISION,
    "lane" "AutomationLane" NOT NULL,
    "status" "AutomationClaimStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "autoApplyEligible" BOOLEAN NOT NULL DEFAULT false,
    "verificationNotes" JSONB,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutomationClaim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationClaimArtifact" (
    "id" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "artifactId" TEXT NOT NULL,

    CONSTRAINT "AutomationClaimArtifact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationVerification" (
    "id" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "sourceTierScore" DOUBLE PRECISION,
    "evidenceCount" INTEGER NOT NULL DEFAULT 0,
    "recencyScore" DOUBLE PRECISION,
    "consistencyScore" DOUBLE PRECISION,
    "contradictionFlag" BOOLEAN NOT NULL DEFAULT false,
    "verifierVersion" TEXT,
    "verificationJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AutomationVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationPolicyDecision" (
    "id" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "lane" "AutomationLane" NOT NULL,
    "decisionReason" TEXT NOT NULL,
    "autoApplyAllowed" BOOLEAN NOT NULL DEFAULT false,
    "policyVersion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AutomationPolicyDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationSourceDomain" (
    "id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "tier" "AutomationSourceTier" NOT NULL DEFAULT 'UNKNOWN',
    "trustScore" DOUBLE PRECISION,
    "autoTrustScore" DOUBLE PRECISION,
    "blocked" BOOLEAN NOT NULL DEFAULT false,
    "autoBlocked" BOOLEAN NOT NULL DEFAULT false,
    "manualBlocked" BOOLEAN,
    "manualTrustScore" DOUBLE PRECISION,
    "notes" TEXT,
    "overrideReason" TEXT,
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutomationSourceDomain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationPolicyMetric" (
    "id" TEXT NOT NULL,
    "scope" "AutomationMetricScope" NOT NULL,
    "key" TEXT NOT NULL,
    "reviewedCount" INTEGER NOT NULL DEFAULT 0,
    "approvedCount" INTEGER NOT NULL DEFAULT 0,
    "rejectedCount" INTEGER NOT NULL DEFAULT 0,
    "appliedCount" INTEGER NOT NULL DEFAULT 0,
    "revertedCount" INTEGER NOT NULL DEFAULT 0,
    "approvalRate" DOUBLE PRECISION,
    "rejectionRate" DOUBLE PRECISION,
    "revertRate" DOUBLE PRECISION,
    "trustScore" DOUBLE PRECISION,
    "autoTrustScore" DOUBLE PRECISION,
    "manualTrustScore" DOUBLE PRECISION,
    "forcedLane" "AutomationLane",
    "notes" TEXT,
    "overrideReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutomationPolicyMetric_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_tokenHash_key" ON "VerificationToken"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "Progress_userId_citySlug_key" ON "Progress"("userId", "citySlug");

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

-- CreateIndex
CREATE INDEX "AutomationArtifact_runId_citySlug_idx" ON "AutomationArtifact"("runId", "citySlug");

-- CreateIndex
CREATE INDEX "AutomationArtifact_artifactType_citySlug_idx" ON "AutomationArtifact"("artifactType", "citySlug");

-- CreateIndex
CREATE UNIQUE INDEX "AutomationClaim_candidateId_key" ON "AutomationClaim"("candidateId");

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

-- CreateIndex
CREATE INDEX "AutomationPolicyMetric_scope_trustScore_idx" ON "AutomationPolicyMetric"("scope", "trustScore");

-- CreateIndex
CREATE UNIQUE INDEX "AutomationPolicyMetric_scope_key_key" ON "AutomationPolicyMetric"("scope", "key");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationToken" ADD CONSTRAINT "VerificationToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Progress" ADD CONSTRAINT "Progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationCandidate" ADD CONSTRAINT "AutomationCandidate_runId_fkey" FOREIGN KEY ("runId") REFERENCES "AutomationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationSource" ADD CONSTRAINT "AutomationSource_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "AutomationCandidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationDecision" ADD CONSTRAINT "AutomationDecision_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "AutomationCandidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationArtifact" ADD CONSTRAINT "AutomationArtifact_runId_fkey" FOREIGN KEY ("runId") REFERENCES "AutomationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationClaim" ADD CONSTRAINT "AutomationClaim_runId_fkey" FOREIGN KEY ("runId") REFERENCES "AutomationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationClaim" ADD CONSTRAINT "AutomationClaim_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "AutomationCandidate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationClaimArtifact" ADD CONSTRAINT "AutomationClaimArtifact_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "AutomationClaim"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationClaimArtifact" ADD CONSTRAINT "AutomationClaimArtifact_artifactId_fkey" FOREIGN KEY ("artifactId") REFERENCES "AutomationArtifact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationVerification" ADD CONSTRAINT "AutomationVerification_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "AutomationClaim"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationPolicyDecision" ADD CONSTRAINT "AutomationPolicyDecision_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "AutomationClaim"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "ResearchTrigger" AS ENUM ('SCHEDULED', 'MANUAL', 'CHAT');

-- CreateEnum
CREATE TYPE "ResearchRunStatus" AS ENUM ('RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ResearchLane" AS ENUM ('GREEN', 'YELLOW', 'RED');

-- CreateEnum
CREATE TYPE "ResearchClaimStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'APPLIED');

-- CreateEnum
CREATE TYPE "ChatRole" AS ENUM ('USER', 'ASSISTANT', 'SYSTEM');

-- CreateTable
CREATE TABLE "ResearchRun" (
    "id" TEXT NOT NULL,
    "trigger" "ResearchTrigger" NOT NULL DEFAULT 'SCHEDULED',
    "scope" TEXT,
    "citySlugs" TEXT[],
    "status" "ResearchRunStatus" NOT NULL DEFAULT 'RUNNING',
    "summaryJson" JSONB,
    "errorLog" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sessionId" TEXT,

    CONSTRAINT "ResearchRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResearchClaim" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "citySlug" TEXT NOT NULL,
    "claimType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "beforeJson" JSONB,
    "afterJson" JSONB,
    "confidence" DOUBLE PRECISION,
    "lane" "ResearchLane" NOT NULL DEFAULT 'YELLOW',
    "status" "ResearchClaimStatus" NOT NULL DEFAULT 'PENDING',
    "reviewNotes" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResearchClaim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClaimEvidence" (
    "id" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "sourceTitle" TEXT,
    "sourceDate" TIMESTAMP(3),
    "excerpt" TEXT,
    "tier" INTEGER NOT NULL DEFAULT 2,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClaimEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SourceDomain" (
    "id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "tier" INTEGER NOT NULL DEFAULT 2,
    "trustScore" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "blocked" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SourceDomain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatSession" (
    "id" TEXT NOT NULL,
    "title" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "role" "ChatRole" NOT NULL,
    "content" TEXT NOT NULL,
    "structuredJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ResearchRun_status_createdAt_idx" ON "ResearchRun"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ResearchRun_trigger_createdAt_idx" ON "ResearchRun"("trigger", "createdAt");

-- CreateIndex
CREATE INDEX "ResearchClaim_status_lane_createdAt_idx" ON "ResearchClaim"("status", "lane", "createdAt");

-- CreateIndex
CREATE INDEX "ResearchClaim_citySlug_claimType_idx" ON "ResearchClaim"("citySlug", "claimType");

-- CreateIndex
CREATE INDEX "ResearchClaim_runId_idx" ON "ResearchClaim"("runId");

-- CreateIndex
CREATE INDEX "ClaimEvidence_claimId_idx" ON "ClaimEvidence"("claimId");

-- CreateIndex
CREATE UNIQUE INDEX "SourceDomain_domain_key" ON "SourceDomain"("domain");

-- CreateIndex
CREATE INDEX "ChatSession_createdAt_idx" ON "ChatSession"("createdAt");

-- CreateIndex
CREATE INDEX "ChatMessage_sessionId_createdAt_idx" ON "ChatMessage"("sessionId", "createdAt");

-- AddForeignKey
ALTER TABLE "ResearchRun" ADD CONSTRAINT "ResearchRun_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ChatSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchClaim" ADD CONSTRAINT "ResearchClaim_runId_fkey" FOREIGN KEY ("runId") REFERENCES "ResearchRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClaimEvidence" ADD CONSTRAINT "ClaimEvidence_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "ResearchClaim"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ChatSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

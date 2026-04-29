-- CreateEnum
CREATE TYPE "AutomationAgentActionStatus" AS ENUM (
  'PENDING_APPROVAL',
  'APPROVED',
  'REJECTED',
  'EXECUTED',
  'CANCELED'
);

-- CreateEnum
CREATE TYPE "AutomationAgentActionSafety" AS ENUM (
  'SAFE',
  'CONFIRMATION_REQUIRED',
  'ADMIN_RATIONALE_REQUIRED'
);

-- CreateEnum
CREATE TYPE "AutomationAgentEventType" AS ENUM (
  'MESSAGE_STREAMED',
  'RUN_REQUEST_QUEUED',
  'RESEARCH_STARTED',
  'CLAIM_IMPROVED',
  'DOMAIN_BLOCKED',
  'DIRECT_ACTION_REQUESTED',
  'DIRECT_ACTION_APPROVED',
  'DIRECT_ACTION_REJECTED',
  'DIRECT_ACTION_EXECUTED',
  'REPLAY_EVAL_RECORDED'
);

-- CreateTable
CREATE TABLE "AutomationAgentActionRequest" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT,
  "messageId" TEXT,
  "runRequestId" TEXT,
  "claimId" TEXT,
  "actionType" TEXT NOT NULL,
  "safety" "AutomationAgentActionSafety" NOT NULL,
  "status" "AutomationAgentActionStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
  "branchId" TEXT,
  "payloadJson" JSONB,
  "rationale" TEXT,
  "requestedBy" TEXT,
  "reviewedBy" TEXT,
  "reviewNote" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "executedAt" TIMESTAMP(3),
  "resultJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AutomationAgentActionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationAgentEvent" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT,
  "messageId" TEXT,
  "runRequestId" TEXT,
  "claimId" TEXT,
  "branchId" TEXT,
  "eventType" "AutomationAgentEventType" NOT NULL,
  "createdBy" TEXT,
  "summaryJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AutomationAgentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AutomationAgentActionRequest_sessionId_createdAt_idx" ON "AutomationAgentActionRequest"("sessionId", "createdAt");
CREATE INDEX "AutomationAgentActionRequest_messageId_createdAt_idx" ON "AutomationAgentActionRequest"("messageId", "createdAt");
CREATE INDEX "AutomationAgentActionRequest_runRequestId_createdAt_idx" ON "AutomationAgentActionRequest"("runRequestId", "createdAt");
CREATE INDEX "AutomationAgentActionRequest_claimId_createdAt_idx" ON "AutomationAgentActionRequest"("claimId", "createdAt");
CREATE INDEX "AutomationAgentActionRequest_status_createdAt_idx" ON "AutomationAgentActionRequest"("status", "createdAt");
CREATE INDEX "AutomationAgentActionRequest_branchId_createdAt_idx" ON "AutomationAgentActionRequest"("branchId", "createdAt");

-- CreateIndex
CREATE INDEX "AutomationAgentEvent_sessionId_createdAt_idx" ON "AutomationAgentEvent"("sessionId", "createdAt");
CREATE INDEX "AutomationAgentEvent_messageId_createdAt_idx" ON "AutomationAgentEvent"("messageId", "createdAt");
CREATE INDEX "AutomationAgentEvent_runRequestId_createdAt_idx" ON "AutomationAgentEvent"("runRequestId", "createdAt");
CREATE INDEX "AutomationAgentEvent_claimId_createdAt_idx" ON "AutomationAgentEvent"("claimId", "createdAt");
CREATE INDEX "AutomationAgentEvent_eventType_createdAt_idx" ON "AutomationAgentEvent"("eventType", "createdAt");
CREATE INDEX "AutomationAgentEvent_branchId_createdAt_idx" ON "AutomationAgentEvent"("branchId", "createdAt");

-- AddForeignKey
ALTER TABLE "AutomationAgentActionRequest"
ADD CONSTRAINT "AutomationAgentActionRequest_sessionId_fkey"
FOREIGN KEY ("sessionId") REFERENCES "AutomationAgentSession"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AutomationAgentActionRequest"
ADD CONSTRAINT "AutomationAgentActionRequest_messageId_fkey"
FOREIGN KEY ("messageId") REFERENCES "AutomationAgentMessage"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AutomationAgentActionRequest"
ADD CONSTRAINT "AutomationAgentActionRequest_runRequestId_fkey"
FOREIGN KEY ("runRequestId") REFERENCES "AutomationRunRequest"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AutomationAgentActionRequest"
ADD CONSTRAINT "AutomationAgentActionRequest_claimId_fkey"
FOREIGN KEY ("claimId") REFERENCES "AutomationClaim"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AutomationAgentEvent"
ADD CONSTRAINT "AutomationAgentEvent_sessionId_fkey"
FOREIGN KEY ("sessionId") REFERENCES "AutomationAgentSession"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AutomationAgentEvent"
ADD CONSTRAINT "AutomationAgentEvent_messageId_fkey"
FOREIGN KEY ("messageId") REFERENCES "AutomationAgentMessage"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AutomationAgentEvent"
ADD CONSTRAINT "AutomationAgentEvent_runRequestId_fkey"
FOREIGN KEY ("runRequestId") REFERENCES "AutomationRunRequest"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AutomationAgentEvent"
ADD CONSTRAINT "AutomationAgentEvent_claimId_fkey"
FOREIGN KEY ("claimId") REFERENCES "AutomationClaim"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

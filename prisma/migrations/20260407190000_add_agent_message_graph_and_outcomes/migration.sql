CREATE TYPE "AutomationAgentMessageStatus" AS ENUM (
  'PENDING',
  'STREAMING',
  'COMPLETED',
  'FAILED',
  'CANCELED'
);

CREATE TYPE "AutomationAgentOutcomeType" AS ENUM (
  'EXPLAIN_ACTION',
  'DIRECT_ACTION',
  'BRANCH_PROMPT_USEFUL',
  'RUN_REQUEST_USEFUL',
  'FOLLOW_UP_IMPROVEMENT',
  'PLANNER_DEFAULT'
);

ALTER TABLE "AutomationAgentMessage"
  ADD COLUMN "status" "AutomationAgentMessageStatus" NOT NULL DEFAULT 'COMPLETED',
  ADD COLUMN "branchId" TEXT,
  ADD COLUMN "branchRootMessageId" TEXT,
  ADD COLUMN "parentMessageId" TEXT,
  ADD COLUMN "revisionOfMessageId" TEXT,
  ADD COLUMN "metadataJson" JSONB,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "AutomationRunRequest"
  ADD COLUMN "messageId" TEXT,
  ADD COLUMN "branchId" TEXT;

CREATE TABLE "AutomationAgentOutcome" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT,
  "messageId" TEXT,
  "runRequestId" TEXT,
  "claimId" TEXT,
  "outcomeType" "AutomationAgentOutcomeType" NOT NULL,
  "branchId" TEXT,
  "summaryJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AutomationAgentOutcome_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AutomationAgentMessage_sessionId_branchId_createdAt_idx"
  ON "AutomationAgentMessage"("sessionId", "branchId", "createdAt");

CREATE INDEX "AutomationAgentMessage_parentMessageId_idx"
  ON "AutomationAgentMessage"("parentMessageId");

CREATE INDEX "AutomationAgentMessage_revisionOfMessageId_idx"
  ON "AutomationAgentMessage"("revisionOfMessageId");

CREATE INDEX "AutomationRunRequest_messageId_idx"
  ON "AutomationRunRequest"("messageId");

CREATE INDEX "AutomationRunRequest_branchId_createdAt_idx"
  ON "AutomationRunRequest"("branchId", "createdAt");

CREATE INDEX "AutomationAgentOutcome_sessionId_createdAt_idx"
  ON "AutomationAgentOutcome"("sessionId", "createdAt");

CREATE INDEX "AutomationAgentOutcome_messageId_createdAt_idx"
  ON "AutomationAgentOutcome"("messageId", "createdAt");

CREATE INDEX "AutomationAgentOutcome_runRequestId_createdAt_idx"
  ON "AutomationAgentOutcome"("runRequestId", "createdAt");

CREATE INDEX "AutomationAgentOutcome_claimId_createdAt_idx"
  ON "AutomationAgentOutcome"("claimId", "createdAt");

CREATE INDEX "AutomationAgentOutcome_outcomeType_createdAt_idx"
  ON "AutomationAgentOutcome"("outcomeType", "createdAt");

ALTER TABLE "AutomationAgentMessage"
  ADD CONSTRAINT "AutomationAgentMessage_parentMessageId_fkey"
  FOREIGN KEY ("parentMessageId") REFERENCES "AutomationAgentMessage"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AutomationAgentMessage"
  ADD CONSTRAINT "AutomationAgentMessage_revisionOfMessageId_fkey"
  FOREIGN KEY ("revisionOfMessageId") REFERENCES "AutomationAgentMessage"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AutomationRunRequest"
  ADD CONSTRAINT "AutomationRunRequest_messageId_fkey"
  FOREIGN KEY ("messageId") REFERENCES "AutomationAgentMessage"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AutomationAgentOutcome"
  ADD CONSTRAINT "AutomationAgentOutcome_sessionId_fkey"
  FOREIGN KEY ("sessionId") REFERENCES "AutomationAgentSession"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AutomationAgentOutcome"
  ADD CONSTRAINT "AutomationAgentOutcome_messageId_fkey"
  FOREIGN KEY ("messageId") REFERENCES "AutomationAgentMessage"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AutomationAgentOutcome"
  ADD CONSTRAINT "AutomationAgentOutcome_runRequestId_fkey"
  FOREIGN KEY ("runRequestId") REFERENCES "AutomationRunRequest"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AutomationAgentOutcome"
  ADD CONSTRAINT "AutomationAgentOutcome_claimId_fkey"
  FOREIGN KEY ("claimId") REFERENCES "AutomationClaim"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

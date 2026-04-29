CREATE TYPE "RankedRuleset" AS ENUM (
  'CLASSIC',
  'NO_LINE_COLORS',
  'STRICT_SPELLING',
  'ONE_LIFE'
);

CREATE TYPE "RankedRunSource" AS ENUM (
  'FREE_PLAY',
  'DAILY',
  'CHALLENGE',
  'BATTLE'
);

CREATE TYPE "RankedRunStatus" AS ENUM (
  'ACTIVE',
  'COMPLETED',
  'ABANDONED'
);

ALTER TABLE "User"
  ADD COLUMN "displayName" TEXT;

CREATE TABLE "DailyChallenge" (
  "id" TEXT NOT NULL,
  "dateKey" TEXT NOT NULL,
  "citySlug" TEXT NOT NULL,
  "cityPath" TEXT NOT NULL,
  "ruleset" "RankedRuleset" NOT NULL DEFAULT 'CLASSIC',
  "seed" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "DailyChallenge_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ChallengeDefinition" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "citySlug" TEXT NOT NULL,
  "cityPath" TEXT NOT NULL,
  "ruleset" "RankedRuleset" NOT NULL DEFAULT 'CLASSIC',
  "seed" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "creatorId" TEXT,

  CONSTRAINT "ChallengeDefinition_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Battle" (
  "id" TEXT NOT NULL,
  "challengeId" TEXT,
  "citySlug" TEXT NOT NULL,
  "cityPath" TEXT NOT NULL,
  "ruleset" "RankedRuleset" NOT NULL DEFAULT 'CLASSIC',
  "seed" TEXT NOT NULL,
  "status" "RankedRunStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "creatorId" TEXT NOT NULL,
  "opponentId" TEXT,

  CONSTRAINT "Battle_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RunSession" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "citySlug" TEXT NOT NULL,
  "cityPath" TEXT NOT NULL,
  "ruleset" "RankedRuleset" NOT NULL DEFAULT 'CLASSIC',
  "sourceType" "RankedRunSource" NOT NULL DEFAULT 'FREE_PLAY',
  "status" "RankedRunStatus" NOT NULL DEFAULT 'ACTIVE',
  "seed" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "firstCorrectAt" TIMESTAMP(3),
  "endedAt" TIMESTAMP(3),
  "completionPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "completionMs" INTEGER,
  "first50Ms" INTEGER,
  "correctGuessCount" INTEGER NOT NULL DEFAULT 0,
  "correctStationCount" INTEGER NOT NULL DEFAULT 0,
  "wrongGuessCount" INTEGER NOT NULL DEFAULT 0,
  "repeatedGuessCount" INTEGER NOT NULL DEFAULT 0,
  "hintCount" INTEGER NOT NULL DEFAULT 0,
  "revealUsed" BOOLEAN NOT NULL DEFAULT false,
  "rankedEligible" BOOLEAN NOT NULL DEFAULT true,
  "disqualificationReason" TEXT,
  "metadataJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "dailyChallengeId" TEXT,
  "challengeId" TEXT,
  "battleId" TEXT,

  CONSTRAINT "RunSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DailyChallenge_dateKey_key"
  ON "DailyChallenge"("dateKey");

CREATE UNIQUE INDEX "ChallengeDefinition_slug_key"
  ON "ChallengeDefinition"("slug");

CREATE INDEX "ChallengeDefinition_citySlug_active_idx"
  ON "ChallengeDefinition"("citySlug", "active");

CREATE INDEX "ChallengeDefinition_createdAt_idx"
  ON "ChallengeDefinition"("createdAt");

CREATE INDEX "Battle_creatorId_createdAt_idx"
  ON "Battle"("creatorId", "createdAt");

CREATE INDEX "Battle_opponentId_createdAt_idx"
  ON "Battle"("opponentId", "createdAt");

CREATE INDEX "RunSession_userId_createdAt_idx"
  ON "RunSession"("userId", "createdAt");

CREATE INDEX "RunSession_citySlug_ruleset_completionMs_idx"
  ON "RunSession"("citySlug", "ruleset", "completionMs");

CREATE INDEX "RunSession_sourceType_createdAt_idx"
  ON "RunSession"("sourceType", "createdAt");

CREATE INDEX "RunSession_dailyChallengeId_rankedEligible_completionMs_idx"
  ON "RunSession"("dailyChallengeId", "rankedEligible", "completionMs");

CREATE INDEX "RunSession_challengeId_rankedEligible_completionMs_idx"
  ON "RunSession"("challengeId", "rankedEligible", "completionMs");

CREATE INDEX "RunSession_battleId_rankedEligible_completionMs_idx"
  ON "RunSession"("battleId", "rankedEligible", "completionMs");

ALTER TABLE "ChallengeDefinition"
  ADD CONSTRAINT "ChallengeDefinition_creatorId_fkey"
  FOREIGN KEY ("creatorId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Battle"
  ADD CONSTRAINT "Battle_challengeId_fkey"
  FOREIGN KEY ("challengeId") REFERENCES "ChallengeDefinition"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Battle"
  ADD CONSTRAINT "Battle_creatorId_fkey"
  FOREIGN KEY ("creatorId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Battle"
  ADD CONSTRAINT "Battle_opponentId_fkey"
  FOREIGN KEY ("opponentId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "RunSession"
  ADD CONSTRAINT "RunSession_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RunSession"
  ADD CONSTRAINT "RunSession_dailyChallengeId_fkey"
  FOREIGN KEY ("dailyChallengeId") REFERENCES "DailyChallenge"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "RunSession"
  ADD CONSTRAINT "RunSession_challengeId_fkey"
  FOREIGN KEY ("challengeId") REFERENCES "ChallengeDefinition"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "RunSession"
  ADD CONSTRAINT "RunSession_battleId_fkey"
  FOREIGN KEY ("battleId") REFERENCES "Battle"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

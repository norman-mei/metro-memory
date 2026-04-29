CREATE TYPE "BattleStatus" AS ENUM (
  'OPEN',
  'READY',
  'ACTIVE',
  'COMPLETED',
  'EXPIRED',
  'CANCELED'
);

CREATE TYPE "PlaylistLaunchMode" AS ENUM (
  'CASUAL',
  'RANKED_CLASSIC',
  'RANKED_RULESET'
);

CREATE TYPE "PlaylistRunStatus" AS ENUM (
  'ACTIVE',
  'COMPLETED',
  'ABANDONED'
);

ALTER TABLE "Battle"
  ADD COLUMN "slug" TEXT,
  ADD COLUMN "inviteToken" TEXT,
  ADD COLUMN "joinedAt" TIMESTAMP(3),
  ADD COLUMN "creatorRunId" TEXT,
  ADD COLUMN "opponentRunId" TEXT,
  ADD COLUMN "winnerUserId" TEXT,
  ADD COLUMN "winnerReason" TEXT;

ALTER TABLE "Battle"
  ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "Battle"
  ALTER COLUMN "status" TYPE "BattleStatus"
  USING (
    CASE
      WHEN "status"::text = 'COMPLETED' THEN 'COMPLETED'
      WHEN "opponentId" IS NOT NULL THEN 'READY'
      ELSE 'OPEN'
    END
  )::"BattleStatus";

ALTER TABLE "Battle"
  ALTER COLUMN "status" SET DEFAULT 'OPEN';

UPDATE "Battle"
SET
  "slug" = COALESCE("slug", 'battle-' || SUBSTRING("id" FROM 1 FOR 8)),
  "inviteToken" = COALESCE("inviteToken", md5("id" || '-invite'));

ALTER TABLE "Battle"
  ALTER COLUMN "slug" SET NOT NULL,
  ALTER COLUMN "inviteToken" SET NOT NULL;

ALTER TABLE "RunSession"
  ADD COLUMN "xpAwarded" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "countedForStreak" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "playlistRunId" TEXT,
  ADD COLUMN "seasonId" TEXT;

CREATE TABLE "PlayerCareerState" (
  "userId" TEXT NOT NULL,
  "lifetimeXp" INTEGER NOT NULL DEFAULT 0,
  "level" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PlayerCareerState_pkey" PRIMARY KEY ("userId")
);

CREATE TABLE "PlayerStreakState" (
  "userId" TEXT NOT NULL,
  "currentStreak" INTEGER NOT NULL DEFAULT 0,
  "bestStreak" INTEGER NOT NULL DEFAULT 0,
  "lastCountedDate" TEXT,
  "freezeTokens" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PlayerStreakState_pkey" PRIMARY KEY ("userId")
);

CREATE TABLE "Season" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "themeColor" TEXT,
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3) NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Season_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SeasonEvent" (
  "id" TEXT NOT NULL,
  "seasonId" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "eventType" TEXT NOT NULL,
  "citySlug" TEXT,
  "cityPath" TEXT,
  "ruleset" "RankedRuleset",
  "targetCount" INTEGER NOT NULL DEFAULT 1,
  "rewardXp" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "SeasonEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SeasonProgress" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "seasonId" TEXT NOT NULL,
  "seasonXp" INTEGER NOT NULL DEFAULT 0,
  "dailyParticipationCount" INTEGER NOT NULL DEFAULT 0,
  "battleWinCount" INTEGER NOT NULL DEFAULT 0,
  "completedEventSlugs" JSONB NOT NULL,
  "completedEventCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "SeasonProgress_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "XpLedgerEntry" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "runSessionId" TEXT,
  "seasonId" TEXT,
  "sourceKey" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "summary" TEXT NOT NULL,
  "metadataJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "XpLedgerEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PlayerLicense" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "awardedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PlayerLicense_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PlayerBadge" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "seasonId" TEXT,
  "key" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "awardedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PlayerBadge_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Campaign" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "themeColor" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CampaignCity" (
  "id" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "citySlug" TEXT NOT NULL,
  "cityPath" TEXT NOT NULL,
  "orderIndex" INTEGER NOT NULL DEFAULT 0,

  CONSTRAINT "CampaignCity_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CampaignProgress" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "completedCitySlugs" JSONB NOT NULL,
  "progressCount" INTEGER NOT NULL DEFAULT 0,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CampaignProgress_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Playlist" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Playlist_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PlaylistItem" (
  "id" TEXT NOT NULL,
  "playlistId" TEXT NOT NULL,
  "citySlug" TEXT NOT NULL,
  "cityPath" TEXT NOT NULL,
  "orderIndex" INTEGER NOT NULL,

  CONSTRAINT "PlaylistItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PlaylistRun" (
  "id" TEXT NOT NULL,
  "playlistId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "mode" "PlaylistLaunchMode" NOT NULL,
  "ruleset" "RankedRuleset",
  "status" "PlaylistRunStatus" NOT NULL DEFAULT 'ACTIVE',
  "currentIndex" INTEGER NOT NULL DEFAULT 0,
  "completedLegs" INTEGER NOT NULL DEFAULT 0,
  "totalLegs" INTEGER NOT NULL DEFAULT 0,
  "aggregateCompletionMs" INTEGER NOT NULL DEFAULT 0,
  "aggregateAccuracy" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "lastCompletedCitySlug" TEXT,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PlaylistRun_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Battle_slug_key"
  ON "Battle"("slug");

CREATE UNIQUE INDEX "Battle_inviteToken_key"
  ON "Battle"("inviteToken");

CREATE INDEX "Battle_status_expiresAt_idx"
  ON "Battle"("status", "expiresAt");

CREATE UNIQUE INDEX "Season_slug_key"
  ON "Season"("slug");

CREATE UNIQUE INDEX "SeasonEvent_seasonId_slug_key"
  ON "SeasonEvent"("seasonId", "slug");

CREATE INDEX "XpLedgerEntry_userId_createdAt_idx"
  ON "XpLedgerEntry"("userId", "createdAt");

CREATE INDEX "XpLedgerEntry_runSessionId_idx"
  ON "XpLedgerEntry"("runSessionId");

CREATE INDEX "XpLedgerEntry_seasonId_createdAt_idx"
  ON "XpLedgerEntry"("seasonId", "createdAt");

CREATE UNIQUE INDEX "PlayerLicense_userId_key_key"
  ON "PlayerLicense"("userId", "key");

CREATE UNIQUE INDEX "PlayerBadge_userId_key_key"
  ON "PlayerBadge"("userId", "key");

CREATE INDEX "PlayerBadge_seasonId_awardedAt_idx"
  ON "PlayerBadge"("seasonId", "awardedAt");

CREATE UNIQUE INDEX "Campaign_slug_key"
  ON "Campaign"("slug");

CREATE UNIQUE INDEX "CampaignCity_campaignId_citySlug_key"
  ON "CampaignCity"("campaignId", "citySlug");

CREATE INDEX "CampaignCity_citySlug_idx"
  ON "CampaignCity"("citySlug");

CREATE UNIQUE INDEX "CampaignProgress_userId_campaignId_key"
  ON "CampaignProgress"("userId", "campaignId");

CREATE INDEX "Playlist_userId_updatedAt_idx"
  ON "Playlist"("userId", "updatedAt");

CREATE UNIQUE INDEX "PlaylistItem_playlistId_orderIndex_key"
  ON "PlaylistItem"("playlistId", "orderIndex");

CREATE INDEX "PlaylistRun_playlistId_createdAt_idx"
  ON "PlaylistRun"("playlistId", "createdAt");

CREATE INDEX "PlaylistRun_userId_updatedAt_idx"
  ON "PlaylistRun"("userId", "updatedAt");

CREATE INDEX "RunSession_playlistRunId_createdAt_idx"
  ON "RunSession"("playlistRunId", "createdAt");

CREATE INDEX "RunSession_seasonId_createdAt_idx"
  ON "RunSession"("seasonId", "createdAt");

ALTER TABLE "PlayerCareerState"
  ADD CONSTRAINT "PlayerCareerState_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PlayerStreakState"
  ADD CONSTRAINT "PlayerStreakState_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SeasonEvent"
  ADD CONSTRAINT "SeasonEvent_seasonId_fkey"
  FOREIGN KEY ("seasonId") REFERENCES "Season"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SeasonProgress"
  ADD CONSTRAINT "SeasonProgress_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SeasonProgress"
  ADD CONSTRAINT "SeasonProgress_seasonId_fkey"
  FOREIGN KEY ("seasonId") REFERENCES "Season"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "XpLedgerEntry"
  ADD CONSTRAINT "XpLedgerEntry_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "XpLedgerEntry"
  ADD CONSTRAINT "XpLedgerEntry_runSessionId_fkey"
  FOREIGN KEY ("runSessionId") REFERENCES "RunSession"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "XpLedgerEntry"
  ADD CONSTRAINT "XpLedgerEntry_seasonId_fkey"
  FOREIGN KEY ("seasonId") REFERENCES "Season"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PlayerLicense"
  ADD CONSTRAINT "PlayerLicense_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PlayerBadge"
  ADD CONSTRAINT "PlayerBadge_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PlayerBadge"
  ADD CONSTRAINT "PlayerBadge_seasonId_fkey"
  FOREIGN KEY ("seasonId") REFERENCES "Season"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CampaignCity"
  ADD CONSTRAINT "CampaignCity_campaignId_fkey"
  FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CampaignProgress"
  ADD CONSTRAINT "CampaignProgress_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CampaignProgress"
  ADD CONSTRAINT "CampaignProgress_campaignId_fkey"
  FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Playlist"
  ADD CONSTRAINT "Playlist_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PlaylistItem"
  ADD CONSTRAINT "PlaylistItem_playlistId_fkey"
  FOREIGN KEY ("playlistId") REFERENCES "Playlist"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PlaylistRun"
  ADD CONSTRAINT "PlaylistRun_playlistId_fkey"
  FOREIGN KEY ("playlistId") REFERENCES "Playlist"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PlaylistRun"
  ADD CONSTRAINT "PlaylistRun_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RunSession"
  ADD CONSTRAINT "RunSession_playlistRunId_fkey"
  FOREIGN KEY ("playlistRunId") REFERENCES "PlaylistRun"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "RunSession"
  ADD CONSTRAINT "RunSession_seasonId_fkey"
  FOREIGN KEY ("seasonId") REFERENCES "Season"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

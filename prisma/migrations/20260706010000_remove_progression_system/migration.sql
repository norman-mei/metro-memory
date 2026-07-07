-- Remove the ranked / progression / live-ops system (ranked runs, streaks,
-- daily challenges, battles, campaigns, seasons, playlists, XP, licenses,
-- badges). CASCADE clears the inter-table foreign keys. Data is intentionally
-- discarded.

DROP TABLE IF EXISTS "XpLedgerEntry" CASCADE;
DROP TABLE IF EXISTS "PlayerLicense" CASCADE;
DROP TABLE IF EXISTS "PlayerBadge" CASCADE;
DROP TABLE IF EXISTS "PlayerCareerState" CASCADE;
DROP TABLE IF EXISTS "PlayerStreakState" CASCADE;
DROP TABLE IF EXISTS "SeasonProgress" CASCADE;
DROP TABLE IF EXISTS "SeasonEvent" CASCADE;
DROP TABLE IF EXISTS "CampaignProgress" CASCADE;
DROP TABLE IF EXISTS "CampaignCity" CASCADE;
DROP TABLE IF EXISTS "Campaign" CASCADE;
DROP TABLE IF EXISTS "PlaylistItem" CASCADE;
DROP TABLE IF EXISTS "PlaylistRun" CASCADE;
DROP TABLE IF EXISTS "Playlist" CASCADE;
DROP TABLE IF EXISTS "RunSession" CASCADE;
DROP TABLE IF EXISTS "Battle" CASCADE;
DROP TABLE IF EXISTS "ChallengeDefinition" CASCADE;
DROP TABLE IF EXISTS "DailyChallenge" CASCADE;
DROP TABLE IF EXISTS "Season" CASCADE;

DROP TYPE IF EXISTS "PlaylistRunStatus";
DROP TYPE IF EXISTS "PlaylistLaunchMode";
DROP TYPE IF EXISTS "BattleStatus";
DROP TYPE IF EXISTS "RankedRunStatus";
DROP TYPE IF EXISTS "RankedRunSource";
DROP TYPE IF EXISTS "RankedRuleset";

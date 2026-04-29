CREATE TABLE "MissedGuessInput" (
  "id" TEXT NOT NULL,
  "citySlug" TEXT NOT NULL,
  "rawInput" TEXT NOT NULL,
  "normalizedInput" TEXT NOT NULL,
  "suggestions" JSONB NOT NULL DEFAULT '[]',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "MissedGuessInput_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MissedGuessInput_citySlug_createdAt_idx"
  ON "MissedGuessInput"("citySlug", "createdAt");

CREATE INDEX "MissedGuessInput_citySlug_normalizedInput_idx"
  ON "MissedGuessInput"("citySlug", "normalizedInput");

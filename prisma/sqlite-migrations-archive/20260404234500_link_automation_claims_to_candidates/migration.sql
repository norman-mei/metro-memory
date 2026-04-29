ALTER TABLE "AutomationClaim"
ADD COLUMN "candidateId" TEXT REFERENCES "AutomationCandidate" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

UPDATE "AutomationClaim"
SET "candidateId" = json_extract("metadataJson", '$.candidateId')
WHERE "candidateId" IS NULL
  AND "metadataJson" IS NOT NULL
  AND json_valid("metadataJson")
  AND json_extract("metadataJson", '$.candidateId') IS NOT NULL;

CREATE UNIQUE INDEX "AutomationClaim_candidateId_key" ON "AutomationClaim"("candidateId");

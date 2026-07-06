-- AlterTable
ALTER TABLE "ChatSession" ADD COLUMN "archivedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "ChatSession_archivedAt_idx" ON "ChatSession"("archivedAt");

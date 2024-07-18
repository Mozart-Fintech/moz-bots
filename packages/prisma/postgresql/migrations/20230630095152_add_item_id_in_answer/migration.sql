-- DropIndex
DROP INDEX IF EXISTS "Answer_groupId_idx";

-- DropIndex
DROP INDEX IF EXISTS "Result_mozbotId_idx";

-- AlterTable
ALTER TABLE
  "Answer"
ADD
  COLUMN "itemId" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Answer_blockId_itemId_idx" ON "Answer"("blockId", "itemId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Answer_storageUsed_idx" ON "Answer"("storageUsed");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Result_mozbotId_hasStarted_createdAt_idx" ON "Result"("mozbotId", "hasStarted", "createdAt" DESC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Result_mozbotId_isCompleted_idx" ON "Result"("mozbotId", "isCompleted");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Mozbot_isArchived_createdAt_idx" ON "Mozbot"("isArchived", "createdAt" DESC);

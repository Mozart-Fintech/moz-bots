-- DropIndex
DROP INDEX IF EXISTS "Result_createdAt_idx";

-- DropIndex
DROP INDEX IF EXISTS "Result_hasStarted_idx";

-- DropIndex
DROP INDEX IF EXISTS "Result_mozbotId_idx";

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Answer_storageUsed_idx" ON "Answer"("storageUsed")
WHERE
  "storageUsed" IS NOT NULL;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Result_mozbotId_createdAt_idx" ON "Result"("mozbotId", "createdAt" DESC NULLS LAST)
WHERE
  "hasStarted" = true;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Result_createdAt_mozbotId_idx" ON "Result"("createdAt" DESC NULLS LAST, "mozbotId")
WHERE
  "hasStarted" = true;
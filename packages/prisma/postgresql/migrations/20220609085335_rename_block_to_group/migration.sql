DROP INDEX "Answer_resultId_blockId_stepId_key";

ALTER TABLE "Answer" 
RENAME COLUMN "stepId" TO "groupId";

ALTER TABLE "PublicMozbot"
RENAME COLUMN "blocks" TO "groups";

ALTER TABLE "PublicMozbot"
ALTER COLUMN groups TYPE JSONB USING to_json(groups);

ALTER TABLE "PublicMozbot"
ALTER COLUMN edges TYPE JSONB USING to_json(edges);

ALTER TABLE "Mozbot"
RENAME COLUMN "blocks" TO "groups";

ALTER TABLE "Mozbot"
ALTER COLUMN groups TYPE JSONB USING to_json(groups);

ALTER TABLE "Mozbot"
ALTER COLUMN edges TYPE JSONB USING to_json(edges);

UPDATE "Mozbot" t
SET groups = REPLACE(REPLACE(REPLACE(t.groups::text, '"blockId":', '"groupId":'), '"steps":', '"blocks":'), '"stepId":', '"blockId":')::jsonb,
edges = REPLACE(REPLACE(t.edges::text, '"blockId":', '"groupId":'), '"stepId":', '"blockId":')::jsonb;

UPDATE "PublicMozbot" t
SET groups = REPLACE(REPLACE(REPLACE(t.groups::text, '"blockId":', '"groupId":'), '"steps":', '"blocks":'), '"stepId":', '"blockId":')::jsonb,
edges = REPLACE(REPLACE(t.edges::text, '"blockId":', '"groupId":'), '"stepId":', '"blockId":')::jsonb;

-- CreateIndex
CREATE UNIQUE INDEX "Answer_resultId_blockId_groupId_key" ON "Answer"("resultId", "blockId", "groupId");

-- DropIndex
DROP INDEX "PublicMozbot_customDomain_key";

-- DropIndex
DROP INDEX "PublicMozbot_publicId_key";

-- AlterTable
ALTER TABLE "PublicMozbot" DROP COLUMN "customDomain",
DROP COLUMN "name",
DROP COLUMN "publicId";

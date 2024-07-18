-- AlterTable
ALTER TABLE
  "PublicMozbot"
ADD
  COLUMN "version" TEXT;

-- AlterTable
ALTER TABLE
  "Mozbot"
ADD
  COLUMN "version" TEXT;

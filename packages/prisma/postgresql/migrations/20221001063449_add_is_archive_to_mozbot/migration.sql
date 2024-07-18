-- DropForeignKey
ALTER TABLE "Result" DROP CONSTRAINT "Result_mozbotId_fkey";

-- AlterTable
ALTER TABLE "Result" ALTER COLUMN "isArchived" SET DEFAULT false;

-- AlterTable
ALTER TABLE "Mozbot" ADD COLUMN     "isArchived" BOOLEAN NOT NULL DEFAULT false;

-- AddForeignKey
ALTER TABLE "Result" ADD CONSTRAINT "Result_mozbotId_fkey" FOREIGN KEY ("mozbotId") REFERENCES "Mozbot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

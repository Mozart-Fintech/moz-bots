-- DropForeignKey
ALTER TABLE "Result" DROP CONSTRAINT "Result_mozbotId_fkey";

-- AddForeignKey
ALTER TABLE "Result" ADD CONSTRAINT "Result_mozbotId_fkey" FOREIGN KEY ("mozbotId") REFERENCES "Mozbot"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

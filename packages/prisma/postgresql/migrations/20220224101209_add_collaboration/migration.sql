-- CreateEnum
CREATE TYPE "CollaborationType" AS ENUM ('READ', 'WRITE');

-- CreateTable
CREATE TABLE "Invitation" (
    "email" TEXT NOT NULL,
    "mozbotId" TEXT NOT NULL,
    "type" "CollaborationType" NOT NULL
);

-- CreateTable
CREATE TABLE "CollaboratorsOnMozbots" (
    "userId" TEXT NOT NULL,
    "mozbotId" TEXT NOT NULL,
    "type" "CollaborationType" NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_email_mozbotId_key" ON "Invitation"("email", "mozbotId");

-- CreateIndex
CREATE UNIQUE INDEX "CollaboratorsOnMozbots_userId_mozbotId_key" ON "CollaboratorsOnMozbots"("userId", "mozbotId");

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_mozbotId_fkey" FOREIGN KEY ("mozbotId") REFERENCES "Mozbot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollaboratorsOnMozbots" ADD CONSTRAINT "CollaboratorsOnMozbots_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollaboratorsOnMozbots" ADD CONSTRAINT "CollaboratorsOnMozbots_mozbotId_fkey" FOREIGN KEY ("mozbotId") REFERENCES "Mozbot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

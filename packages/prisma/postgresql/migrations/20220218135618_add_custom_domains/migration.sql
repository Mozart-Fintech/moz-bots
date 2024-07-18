/*
  Warnings:

  - A unique constraint covering the columns `[customDomain]` on the table `PublicMozbot` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[customDomain]` on the table `Mozbot` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "PublicMozbot" ADD COLUMN     "customDomain" TEXT;

-- AlterTable
ALTER TABLE "Mozbot" ADD COLUMN     "customDomain" TEXT;

-- CreateTable
CREATE TABLE "CustomDomain" (
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "CustomDomain_name_key" ON "CustomDomain"("name");

-- CreateIndex
CREATE UNIQUE INDEX "PublicMozbot_customDomain_key" ON "PublicMozbot"("customDomain");

-- CreateIndex
CREATE UNIQUE INDEX "Mozbot_customDomain_key" ON "Mozbot"("customDomain");

-- AddForeignKey
ALTER TABLE "CustomDomain" ADD CONSTRAINT "CustomDomain_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "Webhook" (
    "id" TEXT NOT NULL,
    "url" TEXT,
    "method" TEXT NOT NULL,
    "queryParams" JSONB[],
    "headers" JSONB[],
    "body" TEXT,
    "mozbotId" TEXT NOT NULL,

    CONSTRAINT "Webhook_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Webhook" ADD CONSTRAINT "Webhook_mozbotId_fkey" FOREIGN KEY ("mozbotId") REFERENCES "Mozbot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "document_blobs" (
    "storedName" TEXT NOT NULL,
    "content" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_blobs_pkey" PRIMARY KEY ("storedName")
);

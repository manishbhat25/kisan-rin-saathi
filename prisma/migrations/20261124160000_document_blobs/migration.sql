-- CreateTable
CREATE TABLE "document_blobs" (
    "storedName" TEXT NOT NULL PRIMARY KEY,
    "content" BLOB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

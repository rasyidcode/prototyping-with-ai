-- CreateTable
CREATE TABLE "DownloadRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "videoUrl" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "title" TEXT,
    "author" TEXT,
    "quality" TEXT NOT NULL DEFAULT 'high',
    "downloadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'success',
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "DownloadRecord_videoUrl_key" ON "DownloadRecord"("videoUrl");

-- CreateIndex
CREATE INDEX "DownloadRecord_videoId_idx" ON "DownloadRecord"("videoId");

-- CreateIndex
CREATE INDEX "DownloadRecord_downloadedAt_idx" ON "DownloadRecord"("downloadedAt");

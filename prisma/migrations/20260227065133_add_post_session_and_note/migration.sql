-- CreateTable
CREATE TABLE "PostSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "rating" INTEGER NOT NULL DEFAULT 0,
    "emotionalState" TEXT NOT NULL DEFAULT '',
    "whatWentWell" TEXT NOT NULL DEFAULT '',
    "whatWentWrong" TEXT NOT NULL DEFAULT '',
    "keyLessons" TEXT NOT NULL DEFAULT '',
    "rulesFollowed" BOOLEAN,
    "rulesNotes" TEXT NOT NULL DEFAULT '',
    "planForTomorrow" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PostSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Note" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "content" TEXT NOT NULL DEFAULT '',
    "tagsJson" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Note_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "PostSession_userId_idx" ON "PostSession"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PostSession_userId_date_key" ON "PostSession"("userId", "date");

-- CreateIndex
CREATE INDEX "Note_userId_idx" ON "Note"("userId");

-- CreateIndex
CREATE INDEX "Note_createdAt_idx" ON "Note"("createdAt");

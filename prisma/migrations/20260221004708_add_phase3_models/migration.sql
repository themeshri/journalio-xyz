-- CreateTable
CREATE TABLE "Strategy" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "color" TEXT NOT NULL DEFAULT '#10b981',
    "icon" TEXT NOT NULL DEFAULT '📋',
    "ruleGroupsJson" TEXT NOT NULL DEFAULT '[]',
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Strategy_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GlobalRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GlobalRule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PreSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "time" TEXT NOT NULL DEFAULT '',
    "energyLevel" INTEGER NOT NULL DEFAULT 0,
    "emotionalState" TEXT NOT NULL DEFAULT '',
    "sessionIntent" TEXT NOT NULL DEFAULT '',
    "maxTrades" TEXT NOT NULL DEFAULT '',
    "maxLoss" TEXT NOT NULL DEFAULT '',
    "timeLimit" TEXT NOT NULL DEFAULT '',
    "defaultPositionSize" TEXT NOT NULL DEFAULT '',
    "hasOpenPositions" BOOLEAN,
    "marketSentiment" TEXT NOT NULL DEFAULT '',
    "solTrend" TEXT NOT NULL DEFAULT '',
    "majorNews" BOOLEAN,
    "majorNewsNote" TEXT NOT NULL DEFAULT '',
    "normalVolume" BOOLEAN,
    "marketSnapshotJson" TEXT NOT NULL DEFAULT '{}',
    "rulesCheckedJson" TEXT NOT NULL DEFAULT '[]',
    "savedAt" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PreSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "JournalEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "tokenMint" TEXT NOT NULL,
    "tradeNumber" INTEGER NOT NULL,
    "strategy" TEXT NOT NULL DEFAULT '',
    "strategyId" TEXT,
    "ruleResultsJson" TEXT NOT NULL DEFAULT '[]',
    "emotionalState" TEXT NOT NULL DEFAULT '',
    "buyNotes" TEXT NOT NULL DEFAULT '',
    "buyRating" INTEGER NOT NULL DEFAULT 0,
    "exitPlan" TEXT NOT NULL DEFAULT '',
    "sellRating" INTEGER NOT NULL DEFAULT 0,
    "followedExitRule" BOOLEAN,
    "sellMistakesJson" TEXT NOT NULL DEFAULT '[]',
    "sellNotes" TEXT NOT NULL DEFAULT '',
    "attachment" TEXT,
    "entryCommentId" TEXT,
    "exitCommentId" TEXT,
    "managementCommentId" TEXT,
    "emotionTag" TEXT,
    "journaledAt" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "JournalEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TradeComment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "rating" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TradeComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Strategy_userId_idx" ON "Strategy"("userId");

-- CreateIndex
CREATE INDEX "GlobalRule_userId_sortOrder_idx" ON "GlobalRule"("userId", "sortOrder");

-- CreateIndex
CREATE INDEX "PreSession_userId_idx" ON "PreSession"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PreSession_userId_date_key" ON "PreSession"("userId", "date");

-- CreateIndex
CREATE INDEX "JournalEntry_userId_idx" ON "JournalEntry"("userId");

-- CreateIndex
CREATE INDEX "JournalEntry_walletAddress_idx" ON "JournalEntry"("walletAddress");

-- CreateIndex
CREATE UNIQUE INDEX "JournalEntry_userId_walletAddress_tokenMint_tradeNumber_key" ON "JournalEntry"("userId", "walletAddress", "tokenMint", "tradeNumber");

-- CreateIndex
CREATE INDEX "TradeComment_userId_category_idx" ON "TradeComment"("userId", "category");

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PaperedPlay" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "coinName" TEXT NOT NULL,
    "contractAddr" TEXT,
    "tokenMint" TEXT,
    "tokenSymbol" TEXT,
    "tokenImage" TEXT,
    "mcWhenSaw" TEXT NOT NULL DEFAULT '',
    "ath" TEXT NOT NULL DEFAULT '',
    "reasonMissed" TEXT NOT NULL DEFAULT '',
    "howToNotMiss" TEXT,
    "attachment" TEXT,
    "entryPrice" REAL,
    "entryTime" DATETIME,
    "exitPrice" REAL,
    "exitTime" DATETIME,
    "hypotheticalPositionSize" REAL,
    "outcome" TEXT,
    "potentialMultiplier" REAL,
    "potentialPnL" REAL,
    "peakMultiplier" REAL,
    "missReason" TEXT,
    "strategyId" TEXT,
    "rulesMetCount" INTEGER,
    "rulesTotalCount" INTEGER,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PaperedPlay_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_PaperedPlay" ("ath", "attachment", "coinName", "contractAddr", "createdAt", "howToNotMiss", "id", "mcWhenSaw", "reasonMissed", "updatedAt", "userId") SELECT "ath", "attachment", "coinName", "contractAddr", "createdAt", "howToNotMiss", "id", "mcWhenSaw", "reasonMissed", "updatedAt", "userId" FROM "PaperedPlay";
DROP TABLE "PaperedPlay";
ALTER TABLE "new_PaperedPlay" RENAME TO "PaperedPlay";
CREATE INDEX "PaperedPlay_userId_idx" ON "PaperedPlay"("userId");
CREATE INDEX "PaperedPlay_createdAt_idx" ON "PaperedPlay"("createdAt");
CREATE INDEX "PaperedPlay_missReason_idx" ON "PaperedPlay"("missReason");
CREATE INDEX "PaperedPlay_strategyId_idx" ON "PaperedPlay"("strategyId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

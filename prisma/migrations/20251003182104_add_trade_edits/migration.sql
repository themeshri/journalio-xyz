-- CreateTable
CREATE TABLE "TradeEdit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tradeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "editedType" TEXT,
    "editedAmountIn" REAL,
    "editedAmountOut" REAL,
    "editedValueUSD" REAL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TradeEdit_tradeId_fkey" FOREIGN KEY ("tradeId") REFERENCES "Trade" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TradeEdit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "TradeEdit_userId_idx" ON "TradeEdit"("userId");

-- CreateIndex
CREATE INDEX "TradeEdit_tradeId_idx" ON "TradeEdit"("tradeId");

-- CreateIndex
CREATE UNIQUE INDEX "TradeEdit_tradeId_userId_key" ON "TradeEdit"("tradeId", "userId");

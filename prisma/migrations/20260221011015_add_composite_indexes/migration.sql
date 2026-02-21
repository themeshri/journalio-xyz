-- CreateIndex
CREATE INDEX "PaperedPlay_userId_createdAt_idx" ON "PaperedPlay"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Trade_walletId_timestamp_idx" ON "Trade"("walletId", "timestamp");

-- CreateIndex
CREATE INDEX "Trade_indexedAt_idx" ON "Trade"("indexedAt");

-- CreateIndex
CREATE INDEX "Wallet_userId_createdAt_idx" ON "Wallet"("userId", "createdAt");

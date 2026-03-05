-- CreateIndex
CREATE INDEX "JournalEntry_userId_tokenMint_tradeNumber_idx" ON "JournalEntry"("userId", "tokenMint", "tradeNumber");

-- CreateIndex
CREATE INDEX "Trade_walletId_indexedAt_idx" ON "Trade"("walletId", "indexedAt");

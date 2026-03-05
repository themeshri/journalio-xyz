-- DropIndex
DROP INDEX IF EXISTS "Trade_signature_key";

-- CreateIndex
CREATE UNIQUE INDEX "Trade_walletId_signature_key" ON "Trade"("walletId", "signature");

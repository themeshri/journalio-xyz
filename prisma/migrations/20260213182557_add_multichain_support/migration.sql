-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Trade" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "walletId" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "timestamp" INTEGER NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'trade',
    "status" TEXT NOT NULL DEFAULT 'confirmed',
    "direction" TEXT NOT NULL DEFAULT 'out',
    "chain" TEXT NOT NULL DEFAULT 'solana',
    "tokenInData" TEXT,
    "tokenOutData" TEXT,
    "amountIn" REAL,
    "amountOut" REAL,
    "priceUSD" REAL,
    "valueUSD" REAL NOT NULL DEFAULT 0,
    "dex" TEXT NOT NULL DEFAULT 'Unknown',
    "protocol" TEXT,
    "application" TEXT,
    "feeData" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "indexedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Trade_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Trade" ("amountIn", "amountOut", "createdAt", "dex", "id", "indexedAt", "priceUSD", "signature", "timestamp", "tokenInData", "tokenOutData", "type", "valueUSD", "walletId") SELECT "amountIn", "amountOut", "createdAt", "dex", "id", "indexedAt", "priceUSD", "signature", "timestamp", "tokenInData", "tokenOutData", "type", "valueUSD", "walletId" FROM "Trade";
DROP TABLE "Trade";
ALTER TABLE "new_Trade" RENAME TO "Trade";
CREATE UNIQUE INDEX "Trade_signature_key" ON "Trade"("signature");
CREATE INDEX "Trade_walletId_idx" ON "Trade"("walletId");
CREATE INDEX "Trade_timestamp_idx" ON "Trade"("timestamp");
CREATE INDEX "Trade_signature_idx" ON "Trade"("signature");
CREATE INDEX "Trade_chain_idx" ON "Trade"("chain");
CREATE INDEX "Trade_type_idx" ON "Trade"("type");
CREATE TABLE "new_Wallet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "nickname" TEXT,
    "chain" TEXT NOT NULL DEFAULT 'ethereum',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Wallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Wallet" ("address", "createdAt", "id", "isDefault", "nickname", "updatedAt", "userId") SELECT "address", "createdAt", "id", "isDefault", "nickname", "updatedAt", "userId" FROM "Wallet";
DROP TABLE "Wallet";
ALTER TABLE "new_Wallet" RENAME TO "Wallet";
CREATE INDEX "Wallet_address_idx" ON "Wallet"("address");
CREATE INDEX "Wallet_userId_idx" ON "Wallet"("userId");
CREATE INDEX "Wallet_chain_idx" ON "Wallet"("chain");
CREATE UNIQUE INDEX "Wallet_userId_address_chain_key" ON "Wallet"("userId", "address", "chain");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

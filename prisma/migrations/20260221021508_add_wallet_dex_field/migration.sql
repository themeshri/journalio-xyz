-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Wallet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "nickname" TEXT,
    "chain" TEXT NOT NULL DEFAULT 'ethereum',
    "dex" TEXT NOT NULL DEFAULT 'other',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Wallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Wallet" ("address", "chain", "createdAt", "id", "isDefault", "nickname", "updatedAt", "userId") SELECT "address", "chain", "createdAt", "id", "isDefault", "nickname", "updatedAt", "userId" FROM "Wallet";
DROP TABLE "Wallet";
ALTER TABLE "new_Wallet" RENAME TO "Wallet";
CREATE INDEX "Wallet_address_idx" ON "Wallet"("address");
CREATE INDEX "Wallet_userId_idx" ON "Wallet"("userId");
CREATE INDEX "Wallet_chain_idx" ON "Wallet"("chain");
CREATE INDEX "Wallet_userId_createdAt_idx" ON "Wallet"("userId", "createdAt");
CREATE UNIQUE INDEX "Wallet_userId_address_chain_key" ON "Wallet"("userId", "address", "chain");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

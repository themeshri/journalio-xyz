-- AlterTable
ALTER TABLE "GlobalRule" ADD COLUMN     "condition" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'manual';

-- AlterTable
ALTER TABLE "JournalEntry" ADD COLUMN     "rMultiple" DOUBLE PRECISION,
ADD COLUMN     "reviewed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tradeRating" INTEGER;

-- AlterTable
ALTER TABLE "Note" ADD COLUMN     "favorite" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "folder" TEXT NOT NULL DEFAULT 'my-notes',
ADD COLUMN     "linkedTokenMint" TEXT,
ADD COLUMN     "linkedTradeNumber" INTEGER,
ADD COLUMN     "linkedWalletAddress" TEXT;

-- AlterTable
ALTER TABLE "Strategy" ADD COLUMN     "isTemplate" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "templateAuthor" TEXT;

-- AlterTable
ALTER TABLE "Wallet" ADD COLUMN     "initialBalance" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "RuleAdherence" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "followed" BOOLEAN NOT NULL DEFAULT false,
    "actual" TEXT NOT NULL DEFAULT '',
    "source" TEXT NOT NULL DEFAULT 'auto',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RuleAdherence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TradeTag" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#71717a',
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TradeTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalEntryTag" (
    "journalEntryId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JournalEntryTag_pkey" PRIMARY KEY ("journalEntryId","tagId")
);

-- CreateIndex
CREATE INDEX "RuleAdherence_userId_date_idx" ON "RuleAdherence"("userId", "date");

-- CreateIndex
CREATE INDEX "RuleAdherence_ruleId_idx" ON "RuleAdherence"("ruleId");

-- CreateIndex
CREATE UNIQUE INDEX "RuleAdherence_userId_ruleId_date_key" ON "RuleAdherence"("userId", "ruleId", "date");

-- CreateIndex
CREATE INDEX "TradeTag_userId_kind_idx" ON "TradeTag"("userId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "TradeTag_userId_label_kind_key" ON "TradeTag"("userId", "label", "kind");

-- CreateIndex
CREATE INDEX "JournalEntryTag_tagId_idx" ON "JournalEntryTag"("tagId");

-- CreateIndex
CREATE INDEX "Note_userId_folder_idx" ON "Note"("userId", "folder");

-- CreateIndex
CREATE INDEX "Note_userId_linkedWalletAddress_linkedTokenMint_linkedTrade_idx" ON "Note"("userId", "linkedWalletAddress", "linkedTokenMint", "linkedTradeNumber");

-- AddForeignKey
ALTER TABLE "RuleAdherence" ADD CONSTRAINT "RuleAdherence_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RuleAdherence" ADD CONSTRAINT "RuleAdherence_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "GlobalRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradeTag" ADD CONSTRAINT "TradeTag_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalEntryTag" ADD CONSTRAINT "JournalEntryTag_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalEntryTag" ADD CONSTRAINT "JournalEntryTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "TradeTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- AlterTable
ALTER TABLE "JournalEntry" ADD COLUMN     "entryReason" TEXT,
ADD COLUMN     "fundTeam" INTEGER,
ADD COLUMN     "fundTokenomics" INTEGER,
ADD COLUMN     "fundUsage" INTEGER,
ADD COLUMN     "narrativeStage" TEXT,
ADD COLUMN     "narrativeThesis" TEXT,
ADD COLUMN     "riskSignal" TEXT,
ADD COLUMN     "riskToZero" TEXT;

-- AlterTable
ALTER TABLE "PostSession" ADD COLUMN     "followedPlan" BOOLEAN,
ADD COLUMN     "fomoEntries" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "limitsBreachedJson" TEXT NOT NULL DEFAULT '[]',
ADD COLUMN     "narrativeCallCorrect" BOOLEAN,
ADD COLUMN     "planDeviations" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "processRating" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "PreSession" ADD COLUMN     "communitiesJson" TEXT NOT NULL DEFAULT '[]',
ADD COLUMN     "conviction" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "narrativeNotes" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "narrativeStage" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "planAdherenceIntent" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "sectorsJson" TEXT NOT NULL DEFAULT '[]',
ADD COLUMN     "setupsWorking" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "watchlistJson" TEXT NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "Wallet" ALTER COLUMN "chain" SET DEFAULT 'solana';

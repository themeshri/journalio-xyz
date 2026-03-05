-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "Wallet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "nickname" TEXT,
    "chain" TEXT NOT NULL DEFAULT 'ethereum',
    "dex" TEXT NOT NULL DEFAULT 'other',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trade" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "timestamp" INTEGER NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'trade',
    "status" TEXT NOT NULL DEFAULT 'confirmed',
    "direction" TEXT NOT NULL DEFAULT 'out',
    "chain" TEXT NOT NULL DEFAULT 'solana',
    "tokenInData" TEXT,
    "tokenOutData" TEXT,
    "amountIn" DOUBLE PRECISION,
    "amountOut" DOUBLE PRECISION,
    "priceUSD" DOUBLE PRECISION,
    "valueUSD" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dex" TEXT NOT NULL DEFAULT 'Unknown',
    "protocol" TEXT,
    "application" TEXT,
    "feeData" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "indexedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Trade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TradeEdit" (
    "id" TEXT NOT NULL,
    "tradeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "editedType" TEXT,
    "editedAmountIn" DOUBLE PRECISION,
    "editedAmountOut" DOUBLE PRECISION,
    "editedValueUSD" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TradeEdit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaperedPlay" (
    "id" TEXT NOT NULL,
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
    "entryPrice" DOUBLE PRECISION,
    "entryTime" TIMESTAMP(3),
    "exitPrice" DOUBLE PRECISION,
    "exitTime" TIMESTAMP(3),
    "hypotheticalPositionSize" DOUBLE PRECISION,
    "outcome" TEXT,
    "potentialMultiplier" DOUBLE PRECISION,
    "potentialPnL" DOUBLE PRECISION,
    "peakMultiplier" DOUBLE PRECISION,
    "missReason" TEXT,
    "strategyId" TEXT,
    "rulesMetCount" INTEGER,
    "rulesTotalCount" INTEGER,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaperedPlay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "displayName" TEXT,
    "transactionLimit" INTEGER NOT NULL DEFAULT 50,
    "showUSDValues" BOOLEAN NOT NULL DEFAULT true,
    "darkMode" BOOLEAN NOT NULL DEFAULT false,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "tradingStartTime" TEXT NOT NULL DEFAULT '09:00',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Strategy" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "color" TEXT NOT NULL DEFAULT '#10b981',
    "icon" TEXT NOT NULL DEFAULT '📋',
    "ruleGroupsJson" TEXT NOT NULL DEFAULT '[]',
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Strategy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GlobalRule" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GlobalRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PreSession" (
    "id" TEXT NOT NULL,
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PreSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalEntry" (
    "id" TEXT NOT NULL,
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "stopLoss" DOUBLE PRECISION,
    "takeProfit" DOUBLE PRECISION,
    "tradeHigh" DOUBLE PRECISION,
    "tradeLow" DOUBLE PRECISION,

    CONSTRAINT "JournalEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "rating" INTEGER NOT NULL DEFAULT 0,
    "emotionalState" TEXT NOT NULL DEFAULT '',
    "whatWentWell" TEXT NOT NULL DEFAULT '',
    "whatWentWrong" TEXT NOT NULL DEFAULT '',
    "keyLessons" TEXT NOT NULL DEFAULT '',
    "rulesFollowed" BOOLEAN,
    "rulesNotes" TEXT NOT NULL DEFAULT '',
    "planForTomorrow" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PostSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Note" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "content" TEXT NOT NULL DEFAULT '',
    "tagsJson" TEXT NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TradeComment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "rating" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TradeComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE INDEX "Wallet_address_idx" ON "Wallet"("address");

-- CreateIndex
CREATE INDEX "Wallet_userId_idx" ON "Wallet"("userId");

-- CreateIndex
CREATE INDEX "Wallet_chain_idx" ON "Wallet"("chain");

-- CreateIndex
CREATE INDEX "Wallet_userId_createdAt_idx" ON "Wallet"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_userId_address_chain_key" ON "Wallet"("userId", "address", "chain");

-- CreateIndex
CREATE UNIQUE INDEX "Trade_signature_key" ON "Trade"("signature");

-- CreateIndex
CREATE INDEX "Trade_walletId_idx" ON "Trade"("walletId");

-- CreateIndex
CREATE INDEX "Trade_timestamp_idx" ON "Trade"("timestamp");

-- CreateIndex
CREATE INDEX "Trade_signature_idx" ON "Trade"("signature");

-- CreateIndex
CREATE INDEX "Trade_chain_idx" ON "Trade"("chain");

-- CreateIndex
CREATE INDEX "Trade_type_idx" ON "Trade"("type");

-- CreateIndex
CREATE INDEX "Trade_walletId_timestamp_idx" ON "Trade"("walletId", "timestamp");

-- CreateIndex
CREATE INDEX "Trade_indexedAt_idx" ON "Trade"("indexedAt");

-- CreateIndex
CREATE INDEX "TradeEdit_userId_idx" ON "TradeEdit"("userId");

-- CreateIndex
CREATE INDEX "TradeEdit_tradeId_idx" ON "TradeEdit"("tradeId");

-- CreateIndex
CREATE UNIQUE INDEX "TradeEdit_tradeId_userId_key" ON "TradeEdit"("tradeId", "userId");

-- CreateIndex
CREATE INDEX "PaperedPlay_userId_idx" ON "PaperedPlay"("userId");

-- CreateIndex
CREATE INDEX "PaperedPlay_createdAt_idx" ON "PaperedPlay"("createdAt");

-- CreateIndex
CREATE INDEX "PaperedPlay_missReason_idx" ON "PaperedPlay"("missReason");

-- CreateIndex
CREATE INDEX "PaperedPlay_strategyId_idx" ON "PaperedPlay"("strategyId");

-- CreateIndex
CREATE INDEX "PaperedPlay_userId_createdAt_idx" ON "PaperedPlay"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserSettings_userId_key" ON "UserSettings"("userId");

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
CREATE INDEX "PostSession_userId_idx" ON "PostSession"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PostSession_userId_date_key" ON "PostSession"("userId", "date");

-- CreateIndex
CREATE INDEX "Note_userId_createdAt_idx" ON "Note"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "TradeComment_userId_category_idx" ON "TradeComment"("userId", "category");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradeEdit" ADD CONSTRAINT "TradeEdit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradeEdit" ADD CONSTRAINT "TradeEdit_tradeId_fkey" FOREIGN KEY ("tradeId") REFERENCES "Trade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaperedPlay" ADD CONSTRAINT "PaperedPlay_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSettings" ADD CONSTRAINT "UserSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Strategy" ADD CONSTRAINT "Strategy_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GlobalRule" ADD CONSTRAINT "GlobalRule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreSession" ADD CONSTRAINT "PreSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostSession" ADD CONSTRAINT "PostSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradeComment" ADD CONSTRAINT "TradeComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


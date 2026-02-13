# Solana Wallet Tracker - Full Documentation (Powered by Moralis API)

## ⚡ Latest Updates
- **Moralis API Integration (Feb 2024)**: Successfully replaced Zerion API with Moralis API for Solana-specific swap transactions. Moralis perfectly fetches all transactions with complete data including:
  - Token details (symbols, names, decimals, logos)
  - USD values for all transactions
  - DEX/Exchange information
  - Transaction signatures and timestamps
  - Buy/sell types with proper token in/out classification
  - Support for up to 5000 transactions with pagination
- **Authentication Removed**: App is now publicly accessible without sign-in requirements.
- **Performance**: Reliable fetching with proper error handling and caching.

## 📋 Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Database Schema](#database-schema)
4. [API Documentation](#api-documentation)
5. [Authentication Flow](#authentication-flow)
6. [Caching Strategy](#caching-strategy)
7. [Frontend Components](#frontend-components)
8. [Setup & Installation](#setup--installation)
9. [Development Guide](#development-guide)
10. [Production Deployment](#production-deployment)
11. [Troubleshooting](#troubleshooting)
12. [Future Enhancements](#future-enhancements)

---

## 📖 Project Overview

### Purpose
A comprehensive web application for tracking Solana wallet swap transactions, analyzing trade cycles, and journaling trading opportunities.

### Key Features
- 🚀 **No authentication required** - Public access for all users
- 💾 Full database persistence with Prisma ORM
- 🌐 **Solana-specific** swap transaction tracking
- 📊 Real-time transaction tracking with smart caching
- 📈 Trade cycle analysis and P/L calculation
- 📝 Trade journaling and missed opportunity tracking
- ⚡ Optimized performance with 5-minute cache strategy
- 🔄 Force refresh capability for real-time data
- 🔗 **Moralis API integration** for comprehensive Solana swap data

### Tech Stack
- **Frontend**: Next.js 15.5, React 19, TailwindCSS 4.1
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: SQLite (dev) / PostgreSQL (production)
- **Authentication**: NextAuth.js v4 with JWT sessions
- **External API**: Moralis API (Solana swap transaction data)
- **Type Safety**: TypeScript 5.9

---

## 🏗️ Architecture

### Application Structure
```
solana-wallet-tracker/
├── app/
│   ├── api/                    # API Routes
│   │   ├── auth/[...nextauth]/ # NextAuth handlers
│   │   ├── trades/             # Transaction caching API
│   │   ├── trade-edits/        # Trade edit management
│   │   ├── wallets/            # Wallet CRUD operations
│   │   ├── settings/           # User preferences
│   │   └── papered-plays/      # Missed opportunities
│   ├── auth/signin/            # Sign-in page
│   ├── settings/               # Settings page
│   ├── layout.tsx              # Root layout with providers
│   └── page.tsx                # Main application
├── components/
│   ├── ErrorMessage.tsx
│   ├── LoadingSpinner.tsx
│   ├── PaperedPlays.tsx        # Missed opportunities UI
│   ├── Providers.tsx           # SessionProvider wrapper
│   ├── SummaryView.tsx         # Trade cycle analysis
│   ├── TradeCycleCard.tsx      # Individual cycle display
│   ├── TransactionList.tsx     # Transaction table
│   └── WalletInput.tsx         # Wallet search
├── lib/
│   ├── auth.ts                 # NextAuth configuration
│   ├── formatters.ts           # Display formatting utilities
│   ├── prisma.ts               # Prisma client singleton
│   ├── settings.ts             # Settings utilities
│   ├── solana-tracker.ts       # Solana API integration
│   └── tradeCycles.ts          # Trade cycle calculations
├── prisma/
│   ├── schema.prisma           # Database schema
│   ├── dev.db                  # SQLite database (dev)
│   └── migrations/             # Database migrations
└── public/                     # Static assets
```

### Data Flow
```
User Input → Next.js Page → API Route → Prisma → Database
                ↓
            Session Check (NextAuth)
                ↓
            Business Logic
                ↓
            Response → UI Update
```

### Authentication Flow
```
1. User visits app → Check session
2. No session → Redirect to /auth/signin
3. User enters email → POST /api/auth/callback/credentials
4. Create/find user in database
5. Create session with JWT
6. Redirect to app with session cookie
7. Session validated on each API request
```

---

## 🗄️ Database Schema

### Entity Relationship Diagram
```
User
├── Account (1:N) - OAuth providers
├── Session (1:N) - Active sessions
├── Wallet (1:N) - Tracked wallets
├── PaperedPlay (1:N) - Missed opportunities
├── TradeEdit (1:N) - Trade adjustments
└── UserSettings (1:1) - Preferences

Wallet
└── Trade (1:N) - Cached transactions
    └── TradeEdit (1:1) - Manual adjustments
```

### Tables in Detail

#### 1. User
Stores user account information.

```prisma
model User {
  id            String    @id @default(cuid())
  name          String?
  email         String?   @unique
  emailVerified DateTime?
  image         String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  accounts      Account[]
  sessions      Session[]
  wallets       Wallet[]
  paperedPlays  PaperedPlay[]
  tradeEdits    TradeEdit[]
  settings      UserSettings?
}
```

**Purpose**: Central user identity
**Relationships**: One-to-many with most other tables
**Indexes**: email (unique)

#### 2. Account
OAuth provider information (NextAuth requirement).

```prisma
model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String?
  access_token      String?
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}
```

**Purpose**: Link users to OAuth providers
**Key Fields**: provider, providerAccountId
**Unique Constraint**: provider + providerAccountId

#### 3. Session
Active user sessions.

```prisma
model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

**Purpose**: Track active login sessions
**Key Fields**: sessionToken (JWT), expires
**Indexes**: sessionToken (unique)

#### 4. Wallet
User's tracked Solana wallets.

```prisma
model Wallet {
  id        String   @id @default(cuid())
  userId    String
  address   String
  nickname  String?
  isDefault Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user   User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  trades Trade[]

  @@unique([userId, address])
  @@index([address])
  @@index([userId])
}
```

**Purpose**: Store user's watched wallets
**Key Fields**: address (Solana wallet), nickname, isDefault
**Unique Constraint**: userId + address (one wallet per user)
**Auto-created**: When user searches a new wallet

#### 5. Trade
Cached transaction data from Solana Tracker API.

```prisma
model Trade {
  id         String   @id @default(cuid())
  walletId   String
  signature  String   @unique
  timestamp  Int
  type       String   // buy, sell, swap

  // Token data stored as JSON
  tokenInData  String  // JSON string
  tokenOutData String  // JSON string

  amountIn   Float
  amountOut  Float
  priceUSD   Float
  valueUSD   Float
  dex        String

  createdAt  DateTime @default(now())
  indexedAt  DateTime @default(now())

  wallet Wallet @relation(fields: [walletId], references: [id], onDelete: Cascade)
  edits  TradeEdit[]

  @@index([walletId])
  @@index([timestamp])
  @@index([signature])
}
```

**Purpose**: Cache Solana transactions
**Key Fields**:
- signature (unique transaction ID)
- timestamp (for sorting)
- tokenInData/tokenOutData (JSON-encoded token info)
- indexedAt (for cache invalidation)

**Caching Strategy**:
- Data cached for 5 minutes
- Force refresh bypasses cache
- Stale cache used as fallback if API fails

**JSON Structure**:
```typescript
// tokenInData / tokenOutData
{
  address: string,
  symbol: string,
  name: string,
  decimals: number,
  logoURI?: string,
  marketCap?: number
}
```

#### 6. TradeEdit
Manual adjustments to trades.

```prisma
model TradeEdit {
  id          String   @id @default(cuid())
  tradeId     String
  userId      String

  // Editable fields
  editedType       String?  // Override buy/sell/swap
  editedAmountIn   Float?   // Override amount in
  editedAmountOut  Float?   // Override amount out
  editedValueUSD   Float?   // Override USD value
  notes            String?  // User notes

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  trade Trade @relation(fields: [tradeId], references: [id], onDelete: Cascade)
  user  User  @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([tradeId, userId])
  @@index([userId])
  @@index([tradeId])
}
```

**Purpose**: Store manual corrections to trade data
**Key Fields**: All optional overrides
**Unique Constraint**: One edit per trade per user
**Use Case**: Fix incorrect API data, add context notes

#### 7. PaperedPlay
Missed trading opportunities.

```prisma
model PaperedPlay {
  id           String   @id @default(cuid())
  userId       String
  coinName     String
  mcWhenSaw    String   // Market cap when first noticed
  ath          String   // All-time high
  reasonMissed String   // Why you didn't buy
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([createdAt])
}
```

**Purpose**: Track missed opportunities for learning
**Key Fields**:
- coinName (e.g., "BONK")
- mcWhenSaw (e.g., "$500K")
- ath (e.g., "$50M")
- reasonMissed (text explanation)

**Calculated Fields**:
- Potential gain multiplier: ATH / mcWhenSaw

#### 8. UserSettings
User preferences.

```prisma
model UserSettings {
  id                String   @id @default(cuid())
  userId            String   @unique
  displayName       String?
  transactionLimit  Int      @default(50)
  showUSDValues     Boolean  @default(true)
  darkMode          Boolean  @default(false)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

**Purpose**: Store user preferences
**Key Fields**:
- displayName (shown in UI)
- transactionLimit (25/50/100/200)
- showUSDValues (toggle)
- darkMode (future feature)

**Auto-created**: On user signup with defaults

#### 9. VerificationToken
Email verification (NextAuth standard).

```prisma
model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}
```

**Purpose**: Email verification for OAuth flows
**Status**: Ready for production OAuth implementation

---

## 🔌 API Documentation

### Authentication

#### Sign In
```http
POST /api/auth/callback/credentials
Content-Type: application/json

{
  "email": "user@example.com",
  "name": "John Doe"
}
```

**Response**: Redirect to callback URL with session cookie

**Behavior**:
1. Find or create user by email
2. Create UserSettings if new user
3. Generate JWT session
4. Set session cookie

#### Get Session
```http
GET /api/auth/session
```

**Response**:
```json
{
  "user": {
    "id": "clxxx...",
    "name": "John Doe",
    "email": "user@example.com",
    "image": null
  },
  "expires": "2025-11-03T00:00:00.000Z"
}
```

#### Sign Out
```http
POST /api/auth/signout
```

---

### Trades

#### Get Trades (with caching)
```http
GET /api/trades?address={wallet_address}&refresh={boolean}
Authorization: Required (session cookie)
```

**Parameters**:
- `address` (required): Solana wallet address
- `refresh` (optional): `true` to bypass cache

**Response**:
```json
{
  "trades": [
    {
      "signature": "5J7x...",
      "timestamp": 1696345200,
      "type": "buy",
      "tokenIn": {
        "address": "So11...",
        "symbol": "SOL",
        "name": "Wrapped SOL",
        "decimals": 9,
        "logoURI": "https://..."
      },
      "tokenOut": {
        "address": "EPjF...",
        "symbol": "BONK",
        "name": "Bonk",
        "decimals": 5,
        "logoURI": "https://..."
      },
      "amountIn": 1.5,
      "amountOut": 1000000,
      "priceUSD": 0.00001,
      "valueUSD": 150.00,
      "dex": "Jupiter",
      "maker": "4NuB8..."
    }
  ],
  "cached": true,
  "cachedAt": "2025-10-03T18:00:00.000Z"
}
```

**Cache Logic**:
1. Check Trade table for wallet
2. If `indexedAt` < 5 min ago → return cached
3. If `indexedAt` > 5 min ago OR `refresh=true` → fetch from API
4. Upsert trades by signature
5. Return fresh data

**Error Handling**:
- API fails → return stale cache with `stale: true`
- No cache → throw error

---

### Trade Edits

#### Get Trade Edit
```http
GET /api/trade-edits?tradeId={trade_id}
Authorization: Required
```

**Response**:
```json
{
  "id": "clxxx...",
  "tradeId": "clyyy...",
  "userId": "clzzz...",
  "editedType": "buy",
  "editedAmountIn": 1.5,
  "editedAmountOut": 950000,
  "editedValueUSD": 145.00,
  "notes": "Adjusted for slippage",
  "createdAt": "2025-10-03T18:00:00.000Z",
  "updatedAt": "2025-10-03T18:05:00.000Z"
}
```

**Returns**: `null` if no edit exists

#### Create/Update Trade Edit
```http
POST /api/trade-edits
Authorization: Required
Content-Type: application/json

{
  "tradeId": "clyyy...",
  "editedType": "buy",
  "editedAmountIn": 1.5,
  "editedAmountOut": 950000,
  "editedValueUSD": 145.00,
  "notes": "Adjusted for slippage"
}
```

**Behavior**: Upsert (create or update existing)

**Response**: Created/updated TradeEdit object

#### Delete Trade Edit
```http
DELETE /api/trade-edits?tradeId={trade_id}
Authorization: Required
```

**Response**:
```json
{
  "success": true
}
```

---

### Wallets

#### List Wallets
```http
GET /api/wallets
Authorization: Required
```

**Response**:
```json
[
  {
    "id": "clxxx...",
    "userId": "clyyy...",
    "address": "4NuB8ZFSjEVWE1nJTJ5RBCRmw9VHUE2g8Q5vFza4L8wm",
    "nickname": "Main Trading Wallet",
    "isDefault": true,
    "createdAt": "2025-10-03T18:00:00.000Z",
    "updatedAt": "2025-10-03T18:00:00.000Z",
    "_count": {
      "trades": 150
    }
  }
]
```

#### Add Wallet
```http
POST /api/wallets
Authorization: Required
Content-Type: application/json

{
  "address": "4NuB8ZFSjEVWE1nJTJ5RBCRmw9VHUE2g8Q5vFza4L8wm",
  "nickname": "Trading Wallet",
  "isDefault": false
}
```

**Validation**:
- Address must be valid Solana format (base58, 32-44 chars)
- Address must be unique per user
- If `isDefault=true`, unsets other defaults

#### Update Wallet
```http
PATCH /api/wallets/{wallet_id}
Authorization: Required
Content-Type: application/json

{
  "nickname": "Updated Name",
  "isDefault": true
}
```

**Ownership**: Only owner can update

#### Delete Wallet
```http
DELETE /api/wallets/{wallet_id}
Authorization: Required
```

**Cascade**: Deletes all associated trades

---

### Settings

#### Get Settings
```http
GET /api/settings
Authorization: Required
```

**Response**:
```json
{
  "id": "clxxx...",
  "userId": "clyyy...",
  "displayName": "John Doe",
  "transactionLimit": 50,
  "showUSDValues": true,
  "darkMode": false,
  "createdAt": "2025-10-03T18:00:00.000Z",
  "updatedAt": "2025-10-03T18:00:00.000Z"
}
```

**Auto-create**: If no settings exist, creates with defaults

#### Update Settings
```http
PATCH /api/settings
Authorization: Required
Content-Type: application/json

{
  "displayName": "Jane Doe",
  "transactionLimit": 100,
  "showUSDValues": false,
  "darkMode": false
}
```

**Validation**:
- transactionLimit: 25, 50, 100, or 200
- All fields optional

---

### Papered Plays

#### List Papered Plays
```http
GET /api/papered-plays
Authorization: Required
```

**Response**:
```json
[
  {
    "id": "clxxx...",
    "userId": "clyyy...",
    "coinName": "BONK",
    "mcWhenSaw": "$500K",
    "ath": "$50M",
    "reasonMissed": "Thought it was a rug pull",
    "createdAt": "2025-10-03T18:00:00.000Z",
    "updatedAt": "2025-10-03T18:00:00.000Z"
  }
]
```

**Sorting**: Newest first (createdAt DESC)

#### Create Papered Play
```http
POST /api/papered-plays
Authorization: Required
Content-Type: application/json

{
  "coinName": "BONK",
  "mcWhenSaw": "$500K",
  "ath": "$50M",
  "reasonMissed": "Thought it was a rug pull"
}
```

**Validation**: All fields required

#### Update Papered Play
```http
PATCH /api/papered-plays/{id}
Authorization: Required
Content-Type: application/json

{
  "coinName": "BONK",
  "mcWhenSaw": "$1M",
  "ath": "$50M",
  "reasonMissed": "Updated reason"
}
```

**Ownership**: Only owner can update

#### Delete Papered Play
```http
DELETE /api/papered-plays/{id}
Authorization: Required
```

**Ownership**: Only owner can delete

---

## 🔐 Authentication Flow

### Simple Email Authentication (Current)

```
┌─────────┐
│  User   │
└────┬────┘
     │ 1. Visit app
     ↓
┌─────────────┐
│ Check Session│
└──────┬──────┘
       │ No session
       ↓
┌──────────────┐
│ /auth/signin │
└──────┬───────┘
       │ 2. Enter email
       ↓
┌─────────────────────┐
│ POST /api/auth/     │
│ callback/credentials│
└─────────┬───────────┘
          │ 3. Find/create user
          ↓
┌──────────────────┐
│ Create Session   │
│ Generate JWT     │
└────────┬─────────┘
         │ 4. Set cookie
         ↓
┌──────────────────┐
│ Redirect to app  │
│ with session     │
└──────────────────┘
```

### Session Validation

Every API request:
```typescript
const session = await getServerSession(authOptions)

if (!session?.user?.id) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

// Proceed with authenticated request
```

### Production OAuth Flow (Future)

```typescript
// lib/auth.ts
import GoogleProvider from 'next-auth/providers/google'
import GitHubProvider from 'next-auth/providers/github'

providers: [
  GoogleProvider({
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  }),
  GitHubProvider({
    clientId: process.env.GITHUB_ID,
    clientSecret: process.env.GITHUB_SECRET,
  }),
]
```

---

## 📦 Caching Strategy

### Transaction Cache (5 Minutes)

**Rationale**:
- Reduce API calls to Solana Tracker
- Improve response time
- Avoid rate limiting
- Reduce costs

**Implementation**:

```typescript
// Check cache
const cachedTrades = await prisma.trade.findMany({
  where: { walletId: wallet.id },
  orderBy: { timestamp: 'desc' }
})

const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
const cacheAge = cachedTrades.length > 0
  ? Date.now() - cachedTrades[0].indexedAt.getTime()
  : Infinity

// Use cache if fresh
if (!forceRefresh && cacheAge < CACHE_DURATION && cachedTrades.length > 0) {
  return cachedData
}

// Fetch fresh data
const apiTrades = await getWalletTrades(address, 50)

// Update cache
for (const trade of apiTrades) {
  await prisma.trade.upsert({
    where: { signature: trade.signature },
    create: { ...tradeData },
    update: { indexedAt: new Date() }
  })
}
```

### Cache Invalidation

**Manual**: Click "🔄 Refresh" button
```typescript
handleSearch(currentWallet, true) // forceRefresh = true
```

**Automatic**: After 5 minutes on next request

### Fallback Strategy

```typescript
try {
  const apiTrades = await getWalletTrades(address, 50)
  // Cache and return
} catch (apiError) {
  // API failed - use stale cache
  if (cachedTrades.length > 0) {
    return {
      trades: cachedTrades,
      cached: true,
      stale: true,
      error: 'API unavailable, showing cached data'
    }
  }
  throw apiError
}
```

### Cache Indicators

```tsx
{cacheInfo && cacheInfo.cached && (
  <span className="ml-2 text-xs bg-blue-200 px-2 py-1 rounded">
    Cached ({new Date(cacheInfo.cachedAt).toLocaleTimeString()})
  </span>
)}
```

---

## 🎨 Frontend Components

### WalletInput
**File**: `components/WalletInput.tsx`
**Purpose**: Search bar for wallet addresses

**Props**:
```typescript
{
  onSearch: (address: string) => void
  isLoading: boolean
}
```

**Validation**:
- Solana address format (base58, 32-44 chars)
- Real-time validation feedback

### TransactionList
**File**: `components/TransactionList.tsx`
**Purpose**: Display list of transactions

**Props**:
```typescript
{
  trades: Trade[]
}
```

**Features**:
- Sortable columns
- Token logos
- DEX badges
- Link to Solana Explorer
- USD value formatting

### SummaryView
**File**: `components/SummaryView.tsx`
**Purpose**: Trade cycle analysis

**Props**:
```typescript
{
  trades: Trade[]
  walletAddress: string
}
```

**Features**:
- Groups trades by token
- Calculates P/L per cycle
- Shows completion status
- Fetches current wallet balance
- Auto-marks cycles complete

### TradeCycleCard
**File**: `components/TradeCycleCard.tsx`
**Purpose**: Individual trade cycle display

**Props**:
```typescript
{
  trade: FlattenedTrade
}
```

**Features**:
- Buy/sell breakdown
- P/L calculation
- Edit mode for adjustments
- Trade journal integration
- Transaction modals
- Market cap estimation

### PaperedPlays
**File**: `components/PaperedPlays.tsx`
**Purpose**: Missed opportunity tracker

**Features**:
- Add/edit/delete plays
- Calculate potential gain
- Timestamp tracking
- Database persistence
- Auth protection

**States**:
- Loading (fetching from database)
- Unauthenticated (show signin prompt)
- Empty (no plays yet)
- List view (display plays)
- Form view (add new play)

### Settings Page
**File**: `app/settings/page.tsx`
**Purpose**: User preferences

**Features**:
- Display name
- Email (read-only from auth)
- Transaction limit selector
- Save/reset functionality
- Loading states
- Auth protection

---

## 🚀 Setup & Installation

### Prerequisites
```bash
Node.js >= 18.x
npm >= 9.x
```

### Environment Setup

1. **Clone repository**:
```bash
git clone <repo-url>
cd test-solana-traker
```

2. **Install dependencies**:
```bash
npm install
```

3. **Create `.env.local`**:
```bash
cp .env.example .env.local
```

4. **Configure environment variables**:
```env
# Solana Tracker API
NEXT_PUBLIC_SOLANA_TRACKER_API_KEY=your-api-key-here

# Database
DATABASE_URL="file:./dev.db"

# NextAuth
NEXTAUTH_SECRET="your-nextauth-secret-here"
NEXTAUTH_URL="http://localhost:3000"
```

5. **Generate NextAuth secret**:
```bash
openssl rand -base64 32
```

6. **Initialize database**:
```bash
npx prisma migrate dev --name init
npx prisma generate
```

7. **Start development server**:
```bash
npm run dev
```

8. **Open Prisma Studio** (optional):
```bash
npx prisma studio
```

### Verify Installation

1. Open http://localhost:3000
2. Go to http://localhost:3000/auth/signin
3. Sign in with any email
4. Search a wallet address
5. Check http://localhost:5555 to see database

---

## 🛠️ Development Guide

### Project Structure Best Practices

**API Routes**:
- One route per resource (`/api/wallets`, `/api/trades`)
- Use HTTP methods (GET, POST, PATCH, DELETE)
- Always validate session first
- Return consistent error format

**Components**:
- One component per file
- Use TypeScript interfaces for props
- Handle loading/error states
- Auth-protect as needed

**Database**:
- Keep schema.prisma as source of truth
- Always create migrations for changes
- Use indexes for frequently queried fields
- Validate data before saving

### Adding a New API Endpoint

1. **Create route file**:
```typescript
// app/api/example/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Your logic here
  const data = await prisma.example.findMany({
    where: { userId: session.user.id }
  })

  return NextResponse.json(data)
}
```

2. **Add TypeScript types**:
```typescript
// lib/types.ts
export interface Example {
  id: string
  userId: string
  data: string
  createdAt: Date
}
```

3. **Create frontend hook** (optional):
```typescript
// hooks/useExample.ts
import { useState, useEffect } from 'react'

export function useExample() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/example')
      .then(res => res.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  return { data, loading }
}
```

### Database Schema Changes

1. **Edit schema**:
```bash
code prisma/schema.prisma
```

2. **Create migration**:
```bash
npx prisma migrate dev --name add_new_field
```

3. **Generate client**:
```bash
npx prisma generate
```

4. **Restart dev server**:
```bash
# Ctrl+C then
npm run dev
```

### Common Commands

```bash
# Development
npm run dev                    # Start dev server
npm run build                  # Build for production
npm run start                  # Start production server

# Database
npx prisma studio              # Open database GUI
npx prisma migrate dev         # Create migration
npx prisma migrate reset       # Reset database (⚠️ deletes data)
npx prisma generate            # Generate Prisma Client
npx prisma db push             # Push schema without migration

# Debugging
npx prisma validate            # Validate schema
npx prisma format              # Format schema file
```

---

## 🌐 Production Deployment

### Switch to PostgreSQL

1. **Update schema**:
```prisma
// prisma/schema.prisma
datasource db {
  provider = "postgresql"  // Changed from sqlite
  url      = env("DATABASE_URL")
}
```

2. **Get PostgreSQL URL**:

**Option A: Supabase** (Free tier)
- Visit https://supabase.com
- Create project
- Copy connection string from Settings → Database

**Option B: Vercel Postgres**
- Visit Vercel dashboard
- Add Postgres database
- Copy connection string

**Option C: Neon** (Serverless)
- Visit https://neon.tech
- Create project
- Copy connection string

3. **Set environment variable**:
```env
DATABASE_URL="postgresql://user:password@host:5432/database?sslmode=require"
```

4. **Run migrations**:
```bash
npx prisma migrate deploy
```

### Deploy to Vercel

1. **Install Vercel CLI**:
```bash
npm i -g vercel
```

2. **Login**:
```bash
vercel login
```

3. **Deploy**:
```bash
vercel
```

4. **Set environment variables**:
```bash
vercel env add NEXTAUTH_SECRET
vercel env add DATABASE_URL
vercel env add NEXT_PUBLIC_SOLANA_TRACKER_API_KEY
```

5. **Redeploy**:
```bash
vercel --prod
```

### Environment Variables for Production

```env
# Required
DATABASE_URL=              # PostgreSQL connection string
NEXTAUTH_SECRET=           # Random 32+ character string
NEXTAUTH_URL=              # https://yourdomain.com

# Optional - OAuth Providers
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_ID=
GITHUB_SECRET=

# API Keys
NEXT_PUBLIC_SOLANA_TRACKER_API_KEY=
```

### Security Checklist

- [ ] Use PostgreSQL (not SQLite) in production
- [ ] Set strong NEXTAUTH_SECRET
- [ ] Enable HTTPS
- [ ] Add OAuth providers (Google/GitHub)
- [ ] Implement rate limiting
- [ ] Add email verification
- [ ] Set up error monitoring (Sentry)
- [ ] Enable CORS properly
- [ ] Validate all user inputs
- [ ] Use environment variables for secrets

---

## 🐛 Troubleshooting

### Database Issues

**Error**: `PrismaClientInitializationError`
```bash
# Solution: Regenerate Prisma Client
npx prisma generate
```

**Error**: `Migration failed`
```bash
# Solution: Reset and re-migrate
npx prisma migrate reset
npx prisma migrate dev
```

**Error**: `P2002: Unique constraint failed`
```bash
# Solution: Record already exists
# Check for duplicates before inserting
```

### Authentication Issues

**Error**: Session not persisting
```env
# Check NEXTAUTH_URL matches your domain
NEXTAUTH_URL="http://localhost:3000"  # Dev
NEXTAUTH_URL="https://yourdomain.com" # Prod
```

**Error**: `NEXTAUTH_SECRET` not set
```bash
# Generate a new secret
openssl rand -base64 32
# Add to .env.local
```

### API Issues

**Error**: 401 Unauthorized
```typescript
// Make sure you're signed in
// Check session in browser DevTools → Application → Cookies
```

**Error**: 500 Internal Server Error
```bash
# Check server logs
# Verify database connection
# Test API endpoint in isolation
```

### Cache Issues

**Stale data showing**
```typescript
// Click "🔄 Refresh" button
// Or clear browser cache
// Or delete Trade records in Prisma Studio
```

---

## 🚀 Future Enhancements

### Planned Features

1. **Trade Cycle Caching**
   - Pre-compute trade cycles
   - Store in new `TradeCycle` table
   - Invalidate on new trades
   - Faster summary view

2. **Advanced Analytics**
   - Win rate by token
   - Average hold time
   - Best/worst trades
   - Monthly P/L charts

3. **Notifications**
   - Email on large trades
   - Webhook integration
   - Discord/Telegram bots
   - Price alerts

4. **Export/Import**
   - CSV export
   - JSON export
   - Import trade history
   - Backup/restore

5. **Multi-Wallet Dashboard**
   - Compare wallets
   - Aggregate stats
   - Portfolio view
   - Net worth tracking

6. **Social Features**
   - Share trade cycles
   - Public profiles
   - Leaderboards
   - Trading journals

7. **Real-time Updates**
   - WebSocket integration
   - Live trade feed
   - Price updates
   - Balance changes

### Technical Improvements

1. **Performance**
   - Query optimization
   - Database indexing
   - Redis caching layer
   - CDN for static assets

2. **Testing**
   - Unit tests (Jest)
   - Integration tests
   - E2E tests (Playwright)
   - API contract tests

3. **Monitoring**
   - Error tracking (Sentry)
   - Performance monitoring
   - Database metrics
   - User analytics

4. **DevOps**
   - CI/CD pipeline
   - Automated migrations
   - Staging environment
   - Database backups

---

## 📚 Additional Resources

### Documentation
- [Next.js Docs](https://nextjs.org/docs)
- [Prisma Docs](https://www.prisma.io/docs)
- [NextAuth.js Docs](https://next-auth.js.org)
- [Solana Tracker API](https://docs.solanatracker.io)

### Tools
- [Prisma Studio](https://www.prisma.io/studio)
- [Vercel](https://vercel.com)
- [Supabase](https://supabase.com)

### Community
- [GitHub Issues](https://github.com/your-repo/issues)
- [Discord Server](#)
- [Twitter](#)

---

**Last Updated**: October 3, 2025
**Version**: 1.0.0
**License**: MIT

---

Built with ❤️ using Next.js, Prisma, and Solana Tracker API

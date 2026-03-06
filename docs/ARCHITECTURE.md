# Journalio — Architecture & Tech Stack

> Solana trading journal with pre-session checklists, post-session reviews, trade cycle analysis, strategy management, and missed trade tracking.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 15.5 (App Router), React 19, TypeScript 5.9 |
| **Styling** | Tailwind CSS v4, shadcn/ui (New York style, Zinc base) |
| **Fonts** | DM Sans (body), JetBrains Mono (numbers/addresses), Space Grotesk (headings) |
| **Colors** | Gold (#F59E0B) primary, Purple (#8B5CF6) accent, Dark Slate (#0F172A) background, Lime for wins, Red for losses |
| **Database** | PostgreSQL (Supabase) via Prisma ORM — pooled connection (port 6543) for runtime, direct (port 5432) for migrations |
| **Auth** | Supabase Auth (Google/Twitter OAuth, email magic links) |
| **Deployment** | Vercel (serverless) — `prisma generate && next build` |
| **External APIs** | Solana Tracker (`data.solanatracker.io`), Zerion (EVM chains) |
| **Testing** | Jest + React Testing Library |

---

## App Structure

```
journalio-xyz/
├── app/                      # Next.js 15 App Router
│   ├── layout.tsx            # Root layout (fonts, ErrorBoundary, SessionProvider)
│   ├── icon.tsx              # Dynamic favicon (gold "J" on dark slate)
│   ├── (dashboard)/          # Main app routes (sidebar layout)
│   │   ├── layout.tsx        # Dashboard wrapper (WalletProvider, SidebarProvider)
│   │   ├── page.tsx          # Overview — session hero, KPIs, calendar, recent trades
│   │   ├── diary/
│   │   │   ├── pre-session/  # Daily pre-trading checklist
│   │   │   ├── post-session/ # End-of-day review
│   │   │   └── notes/        # General notes with tagging
│   │   ├── trade-journal/    # Trade cycle table with journal modals
│   │   ├── history/          # Tabbed: Sessions | Journal | Transactions | Missed | Attachments
│   │   ├── chart-lab/        # Advanced charts (calendar, distribution, equity, holding-time)
│   │   ├── analytics/        # Analytics overview (Cumulative P/L, Duration, Hours)
│   │   ├── missed-trades/    # Papered plays tracker
│   │   ├── strategies/       # Strategy CRUD + global rules
│   │   ├── wallet-management/# Wallet CRUD (localStorage)
│   │   └── settings/         # User preferences (timezone, comments, etc.)
│   ├── api/                  # REST API routes (30+ endpoints)
│   └── auth/                 # Sign-in + OAuth callback
├── components/               # React components
│   ├── ui/                   # shadcn/ui primitives
│   ├── overview/             # Home page components (SessionHero, KPIs, Calendar, etc.)
│   └── auth/                 # Auth form + social buttons
├── lib/                      # Core business logic
│   ├── contexts/             # Split React contexts (4 providers)
│   ├── analytics/            # Analytics computation modules (8 files)
│   ├── hooks/                # SWR hooks for analytics
│   └── server/               # Server-side utilities (caching, dedup, trade resolution)
├── prisma/                   # Database schema + migrations
└── scripts/                  # Utility scripts
```

---

## Layout Hierarchy

```
RootLayout (fonts, ErrorBoundary, Providers/SessionProvider)
  └── DashboardLayout (Suspense → DashboardProviders → SidebarProvider)
        ├── AppSidebar (nav links, wallet display, pre-session dot, dark mode, collapse)
        └── SidebarInset
              ├── header (GlobalFilterBar, SyncButton, ThemeToggle, AccountDropdown)
              └── main (LocalStorageMigration, StaleDataBanner, page content)
```

---

## Pages

| Route | Description | Storage |
|-------|-------------|---------|
| `/` | Overview — session hero card, KPI cards, activity calendar, recent trades (time-range filtered) | API |
| `/diary/pre-session` | Daily checklist: energy, mindset, limits, market context, rules | DB |
| `/diary/post-session` | End-of-day review: rating, emotions, lessons, rules adherence, plan for tomorrow | DB |
| `/diary/notes` | General notes with title, content, and tags | DB |
| `/trade-journal` | Trade cycles table with JournalModal for per-cycle notes | DB |
| `/history` | 5 tabs: Sessions, Journal, Transactions, Missed Trades, Attachments | DB |
| `/chart-lab/calendar` | Monthly P/L calendar heatmap | API |
| `/chart-lab/equity` | Cumulative P/L equity curve | API |
| `/chart-lab/distribution` | P/L distribution histogram | API |
| `/chart-lab/holding-time` | Duration analysis with buckets | API |
| `/analytics` | Recharts: cumulative P/L, duration, hours, discipline (time-range filtered) | API |
| `/missed-trades` | Track tokens you saw but didn't trade, with potential multiplier | DB |
| `/strategies` | Named strategies (entry/exit/stop-loss conditions) + global rules | DB |
| `/wallet-management` | Add/remove/switch saved wallets | localStorage |
| `/settings` | Display name, timezone, trading start time, journal view mode, trade comments | DB |

### Home Page Layout

```
Row 1: Header + SessionPills + TimeRangeFilter
Row 2: SessionHero (tabbed: Pre-Session / Active / Post-Session with session-scoped stats)
Row 3: KPICards (7 metrics: P/L, win rate, profit factor, avg P/L, trades, Sharpe, streak)
Row 4: RecentCycles (left 3 cols) + Evaluation (right 2 cols)
Row 5: ActivityCalendar (full width, GitHub-style yearly heatmap)
```

### Activity Calendar Scoring (0-5 per day)

| Metric | Score |
|--------|-------|
| Traded | +1 |
| Pre-session done | +1 |
| Post-session done | +1 |
| All trades journaled | +1 |
| Rule adherence >= 70% | +1 |

---

## API Routes

### Dashboard & Trades

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/dashboard` | Session | Combined endpoint: trades + strategies + journals + comments + streak + pre/post session status + missed trades |
| GET | `/api/trades` | Session | Fetch trades with 5-min DB cache, stale fallback on API failure |

### Analytics (6 endpoints)

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/analytics/overview` | Session | Cumulative P/L, duration buckets, trading hours |
| GET | `/api/analytics/calendar` | Session | Monthly P/L calendar data |
| GET | `/api/analytics/time` | Session | Hourly, day-of-week, session performance |
| GET | `/api/analytics/missed` | Session | Missed trade stats + hesitation cost |
| POST | `/api/analytics/discipline` | Session | Comment performance, efficiency, what-if analysis |
| POST | `/api/analytics/strategy` | Session | Strategy performance, rule impact |

### CRUD Resources

| Resource | Methods | Auth | Description |
|----------|---------|------|-------------|
| `/api/wallets` | GET, POST | Session | List/create wallets |
| `/api/wallets/[id]` | PATCH, DELETE | Session | Update/delete wallet (ownership verified) |
| `/api/strategies` | GET, POST | Session | List/create strategies |
| `/api/strategies/[id]` | GET, PATCH, DELETE | Session | Get/update/delete strategy |
| `/api/rules` | GET, POST | Session | List/create global rules |
| `/api/rules/[id]` | PATCH, DELETE | Session | Update/delete global rule |
| `/api/journals` | GET, POST | Session | List/upsert journal entries |
| `/api/journals/[id]` | GET, DELETE | Session | Get/delete journal entry |
| `/api/pre-sessions` | GET, POST | Session | List/upsert pre-sessions (supports date range) |
| `/api/pre-sessions/[date]` | GET, DELETE | Session | Get/delete pre-session by date |
| `/api/post-sessions` | GET, POST | Session | List/upsert post-sessions (supports date range) |
| `/api/post-sessions/[date]` | GET, DELETE | Session | Get/delete post-session by date |
| `/api/notes` | GET, POST | Session | List/create notes |
| `/api/notes/[id]` | GET, PATCH, DELETE | Session | Get/update/delete note |
| `/api/papered-plays` | GET, POST | Session | List/create missed trades |
| `/api/papered-plays/[id]` | PATCH, DELETE | Session | Update/delete missed trade |
| `/api/trade-comments` | GET, POST | Session | List (auto-seeds defaults)/create trade comments |
| `/api/trade-comments/[id]` | PATCH, DELETE | Session | Update/delete trade comment |
| `/api/settings` | GET, PATCH | Session | User preferences (timezone, tradingStartTime, etc.) |
| `/api/trade-edits` | GET, POST, DELETE | Session | Trade edit overrides |
| `/api/manual-trades` | POST | Session | Create manual trade entries |

### External API Proxies

| Method | Route | Rate Limit | Description |
|--------|-------|------------|-------------|
| GET | `/api/solana/wallet/[address]/trades` | 30/min IP | Proxy to Solana Tracker trades API |
| GET | `/api/solana/wallet/[address]/balances` | 30/min IP | Proxy to Solana Tracker balances API |
| GET | `/api/solana/token/[mint]` | 30/min IP | Proxy to Solana Tracker token data |
| GET | `/api/evm/wallet/[address]/trades` | 30/min IP | Proxy to Zerion API (Base, BNB) |
| GET | `/api/evm/wallet/[address]/balances` | 30/min IP | Proxy to Zerion API |

### Auth

| Method | Route | Rate Limit | Description |
|--------|-------|------------|-------------|
| POST | `/api/auth/sync-user` | 10/min IP | Sync authenticated Supabase user to DB |

---

## Database Schema (Prisma + PostgreSQL)

### Models

| Model | Purpose | Key Unique Constraints |
|-------|---------|----------------------|
| `User` | User accounts | `email` |
| `Account` | OAuth accounts (NextAuth) | `[provider, providerAccountId]` |
| `Session` | Auth sessions | `sessionToken` |
| `VerificationToken` | Email verification | `token`, `[identifier, token]` |
| `Wallet` | Multi-chain wallets | `[userId, address, chain]` |
| `Trade` | Cached blockchain transactions | `[walletId, signature]` |
| `TradeEdit` | Manual trade overrides | `[tradeId, userId]` |
| `PaperedPlay` | Missed trades | — |
| `UserSettings` | User preferences | `userId` |
| `Strategy` | Trading strategies with rule groups | — |
| `GlobalRule` | Rules shown in pre-session checklist | — |
| `PreSession` | Daily pre-trading checklist | `[userId, date]` |
| `PostSession` | Daily post-session review | `[userId, date]` |
| `JournalEntry` | Per-trade journal entries | `[userId, walletAddress, tokenMint, tradeNumber]` |
| `TradeComment` | Comment library (entry/exit/management) | — |
| `Note` | General notes with tags | — |

### Key Relations

```
User ──┬── Wallet[] ── Trade[] ── TradeEdit[]
       ├── Strategy[]
       ├── GlobalRule[]
       ├── PreSession[]
       ├── PostSession[]
       ├── JournalEntry[]
       ├── TradeComment[]
       ├── Note[]
       ├── PaperedPlay[]
       ├── TradeEdit[]
       └── UserSettings?
```

All foreign keys use `onDelete: Cascade` — deleting a user removes all data.

### Trade Cache

- 5-minute TTL on `Trade.indexedAt`
- `refresh=true` bypasses cache
- Stale fallback on API failure
- Batched `createMany` (200/batch) with `skipDuplicates: true`
- `[walletId, signature]` unique constraint allows multiple users to store same blockchain tx

---

## Auth Flow

**Provider**: Supabase Auth

### Methods
1. **Google OAuth** → `auth.signInWithGoogle()` → `/auth/callback`
2. **Twitter OAuth** → `auth.signInWithTwitter()` → `/auth/callback`
3. **Email Magic Link** → `auth.signInWithEmail(email)` → email → `/auth/callback`

### Flow

```
User visits protected route
  → middleware.ts checks Supabase session
  → No session → redirect to /auth/signin?redirect=/original-path
  → User signs in (OAuth / magic link)
  → /auth/callback sets session cookies
  → Redirect back to original path
  → API routes validate via requireAuth(request) → { userId, email } or 401
```

### Server-Side Auth (`lib/auth-helper.ts`)
- `requireAuth(request)` — Validates Supabase session, returns `{ userId, email }` or 401
- `getAuthUser(request)` — Returns auth info or null
- `ensureUserExists(userId, email)` — Upserts user to DB on first API call

### Middleware (`middleware.ts`)
- Guards all routes except `/api/*`, `/_next/*`, `/auth/*`, `/favicon.ico`
- Refreshes session cookies on valid requests

---

## Data Flow & Context Architecture

### Split Context Providers

Contexts are split for optimal performance (reduce unnecessary re-renders):

```
DashboardProviders
  ├── WalletIdentityContext  — saved/active wallets
  ├── TradeContext           — wallet slots, trades, flattenedTrades, loading states
  ├── MetadataContext        — strategies, journals, streak, session status, time filter, timezone
  └── BalanceContext         — wallet token balances
```

### WalletIdentityContext
- `savedWallets`, `activeWallets`, `hasActiveWallets`, `initialized`
- Methods: `setWalletActive()`, `reloadWallets()`

### TradeContext
- `walletSlots` (per-wallet trade data), `allTrades`, `flattenedTrades`
- `isAnyLoading`, `isAnyStale`
- Methods: `refreshWallet()`, `refreshAll()`

### MetadataContext
- `tradeComments`, `strategies`, `journalMap`, `streak`
- `preSessionDone`, `postSessionDone`, `missedTrades`
- `yearlyPreSessions`, `yearlyPostSessions`
- `timeRange`, `timePreset`, `timezone`, `tradingStartTime`
- Methods: `updateJournalEntry()`, `reloadStrategies()`, `reloadTradeComments()`, `reloadJournals()`, `reloadPreSessionStatus()`, `reloadPostSessionStatus()`, `reloadMissedTrades()`, `setTimeFilter()`

### BalanceContext
- `walletTokens`, `loadingBalances`, `balancesFetched`, `balanceError`

### Backward Compat
- `useWallet()` combines all 4 contexts (barrel export from `lib/wallet-context.tsx`)
- `useMetadata()` for metadata-only consumers

### Initialization Flow

1. On mount → Fetch `/api/dashboard` (single combined endpoint)
2. Hydrate all contexts from response
3. Trigger external API fetch for wallets with no cached trades
4. Auto-fetch balances when trades are loaded (5-min in-memory cache)

### Data Flow Diagram

```
User adds wallets → localStorage + DB via /api/wallets
       ↓
Activates wallet → /api/trades → cached in DB (5-min TTL) → Solana Tracker / Zerion fallback
       ↓
Trade cycles computed client-side (tradeCycles.ts: groups by token → buy/sell cycles)
       ↓
User does pre-session  → DB via /api/pre-sessions  (timezone-aware "today")
User journals trades   → DB via /api/journals
User does post-session → DB via /api/post-sessions  (timezone-aware "today")
User logs missed trades→ DB via /api/papered-plays
User manages strategies→ DB via /api/strategies
       ↓
Home page: SessionHero shows pre/active/post state; ActivityCalendar shows yearly heatmap
Analytics: computed from flattenedTrades + journals + comments + strategies + missed trades
```

---

## Key Components

### Core

| Component | File | Description |
|-----------|------|-------------|
| `AppSidebar` | `components/app-sidebar.tsx` | Sidebar nav with wallet display, pre-session status dot, dark mode toggle, collapse |
| `SessionHero` | `components/overview/SessionHero.tsx` | Tabbed hero card (Pre-Session/Active/Post-Session) with session-scoped stats, rules, timer |
| `KPICards` | `components/overview/KPICards.tsx` | 7-card strip (P/L, win rate, profit factor, avg P/L, trades, Sharpe, streak) |
| `ActivityCalendar` | `components/overview/ActivityCalendar.tsx` | GitHub-style yearly heatmap with 0-5 activity score per day |
| `TimeRangeFilter` | `components/TimeRangeFilter.tsx` | 1D/7D/30D/90D/All presets + custom date range picker |
| `SyncButton` | `components/SyncButton.tsx` | Sync all active wallets + "last synced X ago" |
| `JournalModal` | `components/JournalModal.tsx` | Per-trade journal dialog (strategy, rules, emotions, comments, ratings) |
| `TransactionModal` | `components/TransactionModal.tsx` | Individual transaction list for a trade cycle |
| `TradesTable` | `components/TradesTable.tsx` | Paginated raw transaction table (50/page) |

### Overview Page

| Component | File | Description |
|-----------|------|-------------|
| `RecentCycles` | `components/overview/RecentCycles.tsx` | Last 8 completed trades with journal status |
| `StrategySummary` | `components/overview/StrategySummary.tsx` | Best strategy performance + rule compliance |
| `MistakesSummary` | `components/overview/MistakesSummary.tsx` | Discipline score + top mistakes + emotion tags |
| `QuickStatsBar` | `components/overview/QuickStatsBar.tsx` | Horizontal stats (avg win/loss, best hour, top token, streaks) |
| `Evaluation` | `components/overview/Evaluation.tsx` | Container for StrategySummary + MistakesSummary |
| `PLCalendar` | `components/overview/PLCalendar.tsx` | Monthly P/L calendar grid |

### Utility

| Component | File | Description |
|-----------|------|-------------|
| `DayDetailModal` | `components/DayDetailModal.tsx` | Activity calendar day detail popup |
| `ManualTradeDialog` | `components/ManualTradeDialog.tsx` | Create manual trade entries |
| `EditTradeTab` | `components/EditTradeTab.tsx` | Trade edit overrides UI |
| `StaleDataBanner` | `components/StaleDataBanner.tsx` | Amber banner when trade data is stale |
| `LocalStorageMigration` | `components/LocalStorageMigration.tsx` | One-time migration of localStorage to DB |
| `ErrorBoundary` | `components/ErrorBoundary.tsx` | React error boundary with dev stack trace |
| `Providers` | `components/Providers.tsx` | Supabase SessionProvider wrapper |

---

## Lib Modules

### Core Business Logic

| Module | Key Exports | Description |
|--------|-------------|-------------|
| `tradeCycles.ts` | `TradeInput`, `calculateTradeCycles`, `flattenTradeCycles`, `FlattenedTrade` | Groups txs by token → buy/sell cycles by balance |
| `trading-day.ts` | `getTradingDay`, `getCalendarDate`, `getTradingDayForDate` | Timezone-aware trading day (respects user's timezone + start time) |
| `time-filters.ts` | `TimePreset`, `TimeRange`, `presetToRange`, `filterTradesByRange` | Shared time filter types + utilities |
| `chains.ts` | `Chain`, `ChainConfig`, `CHAIN_CONFIG` | Multi-chain config (Solana, Base, BNB) |
| `formatters.ts` | `formatDuration`, `formatValue`, `formatPrice`, `formatPercentage` | Display formatting |
| `discipline.ts` | `computeTradeDiscipline`, `disciplineColor`, `disciplineBgClass` | Discipline scoring from trade comments |
| `streaks.ts` | `StreakResult` | Journaling streak calculation (current + longest) |
| `constants.ts` | `APP_FEE_RATES` | DEX/app fee rates |

### Data Management (API Clients)

| Module | Key Exports | Description |
|--------|-------------|-------------|
| `strategies.ts` | `loadStrategies`, `createStrategy`, `updateStrategy`, `deleteStrategy` | Strategy CRUD |
| `rules.ts` | `loadRules`, `createRule`, `updateRule`, `deleteRule` | Global rule CRUD |
| `journals.ts` | `loadJournals`, `saveJournal` | Journal entry CRUD |
| `pre-sessions.ts` | `loadPreSession`, `savePreSession` | Pre-session CRUD |
| `post-sessions.ts` | `loadPostSession`, `savePostSession` | Post-session CRUD |
| `notes.ts` | `loadNotes`, `createNote`, `updateNote`, `deleteNote` | Notes CRUD |
| `trade-comments.ts` | `loadTradeComments`, `getCommentsByCategory` | Trade comment library |
| `local-storage.ts` | `safeLocalStorage` | Safe localStorage with quota error handling |

### External APIs

| Module | Key Exports | Description |
|--------|-------------|-------------|
| `solana-tracker.ts` | `getWalletTrades`, `getWalletTokens`, `getTokenData` | Solana Tracker API client |
| `zerion.ts` | `getWalletTrades` | Zerion API client (Base, BNB) |
| `supabase-auth.ts` | `auth` (signIn/signOut/getSession) | Client-side Supabase auth |

### Server Utilities

| Module | Key Exports | Description |
|--------|-------------|-------------|
| `server/resolve-trades.ts` | `resolveFlattenedTrades`, `applyDateFilter`, `parseWalletParams` | Server-side trade resolution with TTL cache |
| `server/analytics-cache.ts` | `getCachedAnalytics`, `setCachedAnalytics` | 60s analytics cache |
| `server/request-dedup.ts` | Request dedup | In-flight request deduplication |
| `auth-helper.ts` | `requireAuth`, `getAuthUser`, `ensureUserExists` | Server-side auth |
| `rate-limit.ts` | `rateLimit`, `rateLimitByUser` | In-memory rate limiter |
| `validations.ts` | Zod schemas, `validateBody` | Input validation for POST/PATCH endpoints |
| `prisma.ts` | `prisma` | Prisma client singleton |
| `env.ts` | `validateEnv` | Startup env var validation |

### Analytics (`lib/analytics/`)

| Module | Description |
|--------|-------------|
| `core.ts` | Core KPIs (P/L, win rate, profit factor, Sharpe ratio) |
| `calendar.ts` | Yearly heatmap, monthly P/L grid |
| `time.ts` | Hourly, day-of-week, session performance |
| `discipline.ts` | Comment performance, efficiency, what-if analysis |
| `strategy.ts` | Strategy performance, rule impact |
| `missed-trades.ts` | Missed trade stats + hesitation cost |
| `patterns.ts` | Auto-detected trading patterns |
| `what-if.ts` | What-if scenario filtering |

### Hooks (`lib/hooks/`)

| Module | Description |
|--------|-------------|
| `use-analytics.ts` | SWR hooks for all analytics endpoints (auto-refetch on param change) |

---

## Security

### Rate Limiting
- Proxy routes (`/api/solana/*`, `/api/evm/*`): 30 req/min per IP
- Auth sync (`/api/auth/sync-user`): 10 req/min per IP
- Expensive endpoints (`/api/trades`, `/api/dashboard`): 30 req/min per user
- In-memory per-instance store with auto-cleanup every 60s

### Auth & Multi-Tenancy
- All `[id]` routes verify ownership (`userId` match) and return 404 (not 403) to prevent enumeration
- `requireAuth()` validates Supabase session server-side on all authenticated endpoints
- All DB queries scoped by `userId`

### Security Headers (`next.config.js`)
- `X-Frame-Options: DENY`
- `Strict-Transport-Security` (HSTS with preload)
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy`: camera, microphone, geolocation disabled
- `Content-Security-Policy`: restricts `connect-src` to self + Supabase + Solana Tracker + Zerion

### Error Handling
- API routes return generic error messages; internal details logged server-side only
- Environment variables validated at startup via `lib/env.ts` in `instrumentation.ts`

---

## Trading Day / Timezone

- `UserSettings.timezone` (IANA string, default "UTC") and `UserSettings.tradingStartTime` (HH:mm, default "09:00")
- `getTradingDay(timezone, tradingStartTime)` — if current time is before start time, returns previous calendar day
- Dashboard API, pre-session, post-session, and context reload callbacks all use timezone-aware "today"
- Settings page has a searchable timezone combobox and time input

---

## Deployment (Vercel)

### Build
```bash
prisma generate && next build
```

### Migrations
Cannot run at build time (Vercel can't reach DB during build). Applied separately:
```bash
npx prisma migrate deploy  # requires DIRECT_URL (port 5432)
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key |
| `DATABASE_URL` | Yes | Pooled connection (port 6543, `?pgbouncer=true`) |
| `DIRECT_URL` | Migrations | Direct connection (port 5432) |
| `SUPABASE_SERVICE_ROLE_KEY` | Optional | Supabase service role key |
| `SOLANA_TRACKER_API_KEY` | Optional | Solana Tracker API key |
| `ZERION_API_KEY` | Optional | Zerion API key (EVM chains) |

### Performance
- `maxDuration = 60` on `/api/trades` and `/api/dashboard` for large wallet fetches
- `instrumentation.ts` only loads Sentry in production
- Trade storage batched in 200-row chunks to avoid pgBouncer statement timeouts
- `/api/wallets` skips `ensureDefaultUser()` after first call via module-level flag

### Redirects
- `/trades` → `/history` (permanent)
- `/journal` → `/missed-trades` (permanent)

---

## localStorage Keys

| Key | Description |
|-----|-------------|
| `journalio_saved_wallets` | Saved wallet objects |
| `journalio_active_wallets` | Currently active wallet list |
| `journalio_journal_view_mode` | UI preference (merged/grouped) |
| `journalio_migration_v1_complete` | One-time migration flag |
| `journalio_strategies_advanced` | Strategies page advanced mode toggle |

---

## Development

```bash
npm run dev           # Start dev server
npm run build         # Production build
npm run lint          # Next.js linting
npm run test          # Run Jest tests
npm run test:watch    # Jest watch mode
npm run test:coverage # Jest with coverage
npx prisma studio     # Database GUI
npx prisma migrate dev --name <name>  # Create migration
npx prisma generate   # Regenerate client after schema change
```

### Tailwind v4 Gotcha
shadcn generates Tailwind v3 syntax for CSS variable references: `w-[--sidebar-width]`.
In Tailwind v4, this must be `w-(--sidebar-width)` (parentheses, not brackets).

---

## Summary

| Metric | Count |
|--------|-------|
| Pages | 18 |
| API Endpoints | 30+ |
| Components | 60+ (including shadcn/ui) |
| Lib Modules | 40+ |
| Database Models | 16 |
| Context Providers | 4 (split for performance) |
| External APIs | 3 (Solana Tracker, Zerion, Supabase) |
| Supported Chains | 3 (Solana, Base, BNB) |

# Journalio — Solana Trading Journal

<!-- UPDATE THIS FILE when adding new pages, components, or lib modules. -->
<!-- UPDATE FEATURES.md when adding or changing any user-facing feature. -->
<!-- Run `bash scripts/update-claude-md.sh` to see current project structure. -->

## Overview

Solana trading journal with pre-session checklists, trade cycle analysis, strategy management, and missed trade tracking. Dashboard-based UI with sidebar navigation.

## Tech Stack

- **Framework**: Next.js 15.5 (App Router), React 19, TypeScript 5.9
- **Styling**: Tailwind CSS v4, shadcn/ui (New York style, Zinc base)
- **Fonts**: DM Sans (`--font-dm-sans` body), JetBrains Mono (`--font-jetbrains-mono` numbers/addresses)
- **Colors**: Zinc (neutral) + Emerald (primary/success), Red (destructive)
- **Database**: Prisma ORM, SQLite (dev) / PostgreSQL (prod)
- **Auth**: NextAuth.js v4 (email-only credentials, JWT sessions)
- **External API**: Solana Tracker API (`data.solanatracker.io`)

## App Structure

```
app/
├── layout.tsx                 # Root layout (fonts, ErrorBoundary, SessionProvider)
├── (dashboard)/
│   ├── layout.tsx             # Dashboard layout (WalletProvider, SidebarProvider, AppSidebar)
│   ├── page.tsx               # Overview — stat cards + recent transactions
│   ├── pre-session/           # Daily pre-trading checklist
│   ├── trade-journal/         # Trade cycle table with journal modals
│   ├── history/               # Tabbed: Transactions | Pre-Sessions | Journal
│   ├── analytics/             # Charts (Cumulative P/L, Duration, Trading Hours)
│   ├── missed-trades/         # Papered plays tracker (API-backed)
│   ├── strategies/            # Strategy CRUD + global rules (localStorage)
│   ├── wallet-management/     # Saved wallets CRUD (localStorage)
│   └── settings/              # User preferences (API-backed)
├── api/                       # API routes (see below)
└── auth/signin/               # NextAuth sign-in page
```

### Layout Hierarchy

```
RootLayout (fonts, ErrorBoundary, Providers/SessionProvider)
  └── DashboardLayout (Suspense → WalletProvider → SidebarProvider)
        ├── AppSidebar (nav links, active wallet display)
        └── SidebarInset → header + main content area
```

## Pages

| Route | Page | Storage | Description |
|-------|------|---------|-------------|
| `/` | Overview | API | Stat cards, equity curve, calendar, insights — time-range filtered |
| `/pre-session` | Pre-Session | API (DB) | Daily checklist: energy, mindset, limits, market context, rules |
| `/trade-journal` | Trade Journal | API (DB) | Trade cycles table with JournalModal for per-cycle notes |
| `/history` | History | API (DB) | 3 tabs: Transactions (API), Pre-Sessions (API), Journal (API) |
| `/analytics` | Analytics | API | Recharts: cumulative P/L, duration, hours, discipline — time-range filtered |
| `/missed-trades` | Missed Trades | API (DB) | Track tokens you saw but didn't trade, with potential multiplier |
| `/strategies` | Strategies | API (DB) | Named strategies (entry/exit/stop-loss conditions) + global rules |
| `/wallet-management` | Wallet Mgmt | localStorage | Add/remove/switch saved wallets |
| `/settings` | Settings | API (DB) | Display name, tx limit, USD toggle, trade comments |

## Key Components

| Component | File | Description |
|-----------|------|-------------|
| `AppSidebar` | `components/app-sidebar.tsx` | Sidebar nav with wallet display, pre-session status dot (reads from MetadataContext) |
| `TimeRangeFilter` | `components/TimeRangeFilter.tsx` | Shared time filter: 1D/7D/30D/90D/All presets + custom date range picker |
| `TradesTable` | `components/TradesTable.tsx` | Paginated raw transaction table (50/page) |
| `JournalModal` | `components/JournalModal.tsx` | Dialog for journaling buy/sell analysis per trade cycle |
| `TransactionModal` | `components/TransactionModal.tsx` | Dialog showing individual txs in a trade cycle |
| `ErrorBoundary` | `components/ErrorBoundary.tsx` | React error boundary with dev stack trace |
| `Providers` | `components/Providers.tsx` | NextAuth SessionProvider wrapper |
| `StaleDataBanner` | `components/StaleDataBanner.tsx` | Amber banner shown when trade data is served from stale cache |
| `LocalStorageMigration` | `components/LocalStorageMigration.tsx` | One-time migration of localStorage data to database |

Legacy (not used in dashboard): `WalletInput.tsx`, `TransactionList.tsx`, `PaperedPlays.tsx`, `SummaryView.tsx`, `TradeCycleCard.backup.tsx`, `SkeletonLoading.tsx`

## Lib Modules

| Module | Exports | Description |
|--------|---------|-------------|
| `wallet-context.tsx` | `WalletProvider`, `useWallet`, `useMetadata` | Barrel re-export of split contexts; `useWallet()` for compat, `useMetadata()` for metadata-only |
| `time-filters.ts` | `TimePreset`, `TimeRange`, `presetToRange`, `filterTradesByRange` | Shared time filter types + utilities (client and server) |
| `solana-tracker.ts` | `isValidSolanaAddress`, `getWalletTrades`, `getWalletTokens`, `getTokenData` | Solana Tracker API client; browser requests proxy through `/api/solana/*` |
| `tradeCycles.ts` | `calculateTradeCycles`, `flattenTradeCycles` | Groups txs by token → splits into buy/sell cycles by balance |
| `contexts/` | `DashboardProviders`, `WalletIdentityContext`, `TradeContext`, `MetadataContext`, `BalanceContext` | Split context: identity, trades, metadata (strategies/journals/streak/time-filter/pre-session/missed-trades), balances |
| `analytics.ts` → `analytics/` | Re-export barrel; modules: `core`, `calendar`, `time`, `discipline`, `what-if`, `patterns`, `strategy`, `missed-trades`, `types`, `helpers` | Analytics computation split by domain |
| `server/resolve-trades.ts` | `resolveFlattenedTrades`, `applyDateFilter`, `parseWalletParams`, `sanitizeForJSON` | Server-side trade resolution with TTL cache, dedup, date filtering |
| `local-storage.ts` | `safeLocalStorage` | Safe localStorage wrapper with quota error handling and toast notifications |
| `strategies.ts` | `loadStrategies`, `createStrategy`, `updateStrategy`, `deleteStrategy` | Async strategy CRUD via API |
| `trade-comments.ts` | `loadTradeComments`, `getCommentsByCategory`, `getCommentById` | Async trade comment loading + pure helpers |
| `rules.ts` | `loadRules`, `createRule`, `updateRule`, `deleteRule` | Async global rule CRUD via API |
| `pre-sessions.ts` | `loadPreSessions`, `loadPreSession`, `savePreSession` | Async pre-session CRUD via API |
| `journals.ts` | `loadJournals`, `saveJournal` | Async journal entry CRUD via API |
| `formatters.ts` | `formatDuration`, `formatTime`, `formatValue`, `formatTokenAmount`, `formatMarketCap`, `formatPrice`, `formatPercentage` | Display formatting |
| `utils.ts` | `cn` | Tailwind class merge (clsx + tailwind-merge) |
| `auth.ts` | `authOptions` | NextAuth config (credentials provider, JWT strategy) |
| `prisma.ts` | `prisma` | Prisma client singleton |
| `settings.ts` | — | Legacy localStorage settings (unused by current Settings page) |
| `zerion.ts` | — | Legacy Zerion API client (unused) |
| `moralis.ts` | — | Legacy Moralis API client (unused) |

## API Routes

### Active

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/dashboard?addresses=&chains=&dexes=` | No | Combined endpoint: trades, strategies, journals, comments, streak, pre-session status, missed trades |
| GET | `/api/trades?address=&refresh=` | No | Fetch trades with 5-min DB cache, fallback to stale |
| GET | `/api/analytics/overview?...&startDate=&endDate=` | No | Cumulative P/L, duration buckets, trading hours |
| GET | `/api/analytics/calendar?...&year=&month=` | No | Monthly P/L calendar data |
| GET | `/api/analytics/time?...&startDate=&endDate=` | No | Hourly, day-of-week, session performance |
| GET | `/api/analytics/missed?...` | No | Missed trade stats + hesitation cost |
| POST | `/api/analytics/discipline?...` | No | Comment performance, efficiency, what-if analysis |
| POST | `/api/analytics/strategy?...` | No | Strategy performance, rule impact |
| GET | `/api/papered-plays` | No | List missed trades (default-user) |
| POST | `/api/papered-plays` | No | Create missed trade entry |
| DELETE/PATCH | `/api/papered-plays/[id]` | No | Delete/update missed trade |
| GET/POST | `/api/rules` | No | List/create global rules |
| PATCH/DELETE | `/api/rules/[id]` | No | Update/delete global rule |
| GET/POST | `/api/trade-comments` | No | List (auto-seeds defaults)/create trade comments |
| PATCH/DELETE | `/api/trade-comments/[id]` | No | Update/delete trade comment |
| GET/POST | `/api/strategies` | No | List/create strategies |
| GET/PATCH/DELETE | `/api/strategies/[id]` | No | Get/update/delete strategy |
| GET/POST | `/api/pre-sessions` | No | List/upsert pre-sessions |
| GET/DELETE | `/api/pre-sessions/[date]` | No | Get/delete pre-session by date |
| GET/POST | `/api/journals` | No | List/upsert journal entries |
| GET/DELETE | `/api/journals/[id]` | No | Get/delete journal entry |
| GET/PATCH | `/api/settings` | Session | User preferences |
| GET/POST | `/api/wallets` | Session | List/create wallets |
| DELETE/PATCH | `/api/wallets/[id]` | Session | Delete/update wallet |
| GET/POST/DELETE | `/api/trade-edits` | Session | Trade edit overrides |
| GET | `/api/solana/wallet/[address]/trades` | No | Proxy to Solana Tracker trades API |
| GET | `/api/solana/wallet/[address]/balances` | No | Proxy to Solana Tracker balances API |
| GET | `/api/solana/token/[mint]` | No | Proxy to Solana Tracker token data |
| * | `/api/auth/[...nextauth]` | — | NextAuth handlers |

### Legacy (unused)

- `/api/zerion/wallets/[address]/transactions` — Zerion proxy
- `/api/zerion/wallets/[address]/portfolio` — Zerion proxy

## Data Storage

### localStorage Keys

| Key | Used By | Content |
|-----|---------|---------|
| `journalio_saved_wallets` | Wallet Management | Saved wallet objects |
| `journalio_journal_view_mode` | Settings, Trade Journal | Journal view mode preference (merged/grouped) |
| `journalio_migration_v1_complete` | LocalStorageMigration | Flag indicating one-time migration is done |

**Migrated to DB (Phase 3)**: strategies, rules, pre-sessions, journals, trade comments — legacy localStorage keys still read by `LocalStorageMigration` component for one-time migration.

### Database (Prisma)

Models: `User`, `Account`, `Session`, `Wallet`, `Trade`, `TradeEdit`, `PaperedPlay`, `UserSettings`, `VerificationToken`, `Strategy`, `GlobalRule`, `PreSession`, `JournalEntry`, `TradeComment`

Trade cache: 5-minute TTL on `Trade.indexedAt`, force refresh bypasses cache, stale fallback on API failure.

Dashboard data flow: `/api/dashboard` returns trades + strategies + journals + comments + streak + pre-session status + missed trades in one call. `MetadataContext` holds pre-session status, missed trades, time range filter, and provides reload callbacks. `AppSidebar` and `InsightsPanel` read from context (no individual fetches).

Analytics data flow: 6 server-side endpoints (`/api/analytics/*`) accept optional `startDate`/`endDate` query params (UNIX seconds). `applyDateFilter()` in `lib/server/resolve-trades.ts` filters after trade resolution. SWR hooks in `lib/hooks/use-analytics.ts` auto-refetch when URL params change.

## Styling Notes

### Tailwind v4 Gotcha
shadcn generates Tailwind v3 syntax for CSS variable references: `w-[--sidebar-width]`
In Tailwind v4 this must be `w-(--sidebar-width)` (parentheses, not brackets).
**Fix all `[--var]` to `(--var)` in generated shadcn components.**

### Theme
- `globals.css` uses `@theme inline` and `@plugin` syntax (Tailwind v4)
- shadcn/ui components in `components/ui/`
- `components.json` configured with `zinc` baseColor

## Error Handling

### localStorage
- All writes go through `safeLocalStorage` from `lib/local-storage.ts`
- Catches `QuotaExceededError` and shows a toast notification via sonner
- Reads silently fall back to defaults on parse errors
- New localStorage writes **must** use `safeLocalStorage`, never raw `localStorage.setItem`

### API Trade Cache
- 5-minute TTL on `Trade.indexedAt`; `refresh=true` bypasses cache
- On Solana Tracker API failure, returns stale cached data with `{ stale: true }`
- `WalletProvider` tracks `isStale` per wallet slot; `isAnyStale` aggregates across all
- `StaleDataBanner` component renders amber banner when any wallet has stale data

### External API Proxy
- `/api/solana/*` routes pass through HTTP status codes from Solana Tracker
- Client-side errors surface as `error` field on `WalletSlot`

### Data Storage Architecture
- See `docs/DATA-STORAGE.md` for the full localStorage vs DB split, rationale, and migration plan

## Development

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run test         # Run Jest tests
npx prisma studio    # Database GUI
npx prisma migrate dev --name <name>  # Create migration
npx prisma generate  # Regenerate client after schema change
```

### Environment Variables

```env
SOLANA_TRACKER_API_KEY=       # Server-side Solana Tracker API key
NEXT_PUBLIC_SOLANA_TRACKER_API_KEY=  # Client-side (used in solana-tracker.ts browser path)
DATABASE_URL="file:./dev.db"  # SQLite for dev
NEXTAUTH_SECRET=              # openssl rand -base64 32
NEXTAUTH_URL="http://localhost:3000"
```

### Performance Notes
- `instrumentation.ts` only loads Sentry in production (`NODE_ENV === 'production'`) to avoid `@prisma/instrumentation` warnings in dev
- `next.config.js` sets `outputFileTracingRoot` to prevent workspace root misresolution
- `/api/wallets` uses a module-level flag to skip `ensureDefaultUser()` upsert after first call
- Pre-session page useEffect has a `stale` cleanup guard for React StrictMode double-mount

---
<!-- Auto-updated by post-commit hook -->
Last updated: 2026-02-22

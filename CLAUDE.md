# Journalio — Solana Trading Journal

<!-- UPDATE THIS FILE when adding new pages, components, or lib modules. -->
<!-- UPDATE FEATURES.md when adding or changing any user-facing feature. -->
<!-- Run `bash scripts/update-claude-md.sh` to see current project structure. -->

## Overview

Solana trading journal with pre-session checklists, post-session reviews, trade cycle analysis, strategy management, and missed trade tracking. Dashboard-based UI with sidebar navigation. Gamified daily checklist and GitHub-style activity calendar on the home page.

## Tech Stack

- **Framework**: Next.js 15.5 (App Router), React 19, TypeScript 5.9
- **Styling**: Tailwind CSS v4, shadcn/ui (New York style, Zinc base)
- **Fonts**: DM Sans (`--font-dm-sans` body), JetBrains Mono (`--font-jetbrains-mono` numbers/addresses)
- **Colors**: Zinc (neutral) + Emerald (primary/success), Red (destructive)
- **Database**: Prisma ORM, PostgreSQL (Supabase) — pooled connection (port 6543) for runtime, direct (port 5432) for migrations
- **Auth**: Supabase Auth (Google/Twitter OAuth, email magic links)
- **Deployment**: Vercel (serverless) — `prisma generate && next build` (migrations applied separately)
- **External APIs**: Solana Tracker API (`data.solanatracker.io`), Zerion (EVM chains)

## App Structure

```
app/
├── layout.tsx                 # Root layout (fonts, ErrorBoundary, SessionProvider)
├── (dashboard)/
│   ├── layout.tsx             # Dashboard layout (WalletProvider, SidebarProvider, AppSidebar)
│   ├── page.tsx               # Overview — daily checklist, KPIs, activity calendar, recent trades
│   ├── diary/
│   │   ├── pre-session/       # Daily pre-trading checklist
│   │   ├── post-session/      # End-of-day review
│   │   └── notes/             # General notes with tagging
│   ├── trade-journal/         # Trade cycle table with journal modals
│   ├── history/               # Tabbed: Transactions | Pre-Sessions | Journal
│   ├── chart-lab/             # Advanced charts (calendar, distribution, equity, holding-time)
│   ├── analytics/             # Charts (Cumulative P/L, Duration, Trading Hours)
│   ├── missed-trades/         # Papered plays tracker (API-backed)
│   ├── strategies/            # Strategy CRUD + global rules (DB-backed)
│   ├── wallet-management/     # Saved wallets CRUD (localStorage)
│   └── settings/              # User preferences incl. timezone + trading start time (API-backed)
├── api/                       # API routes (see below)
└── auth/signin/               # NextAuth sign-in page
```

### Layout Hierarchy

```
RootLayout (fonts, ErrorBoundary, Providers/SessionProvider)
  └── DashboardLayout (Suspense → WalletProvider → SidebarProvider)
        ├── AppSidebar (nav links, active wallet display)
        └── SidebarInset → header (GlobalFilterBar, SyncButton + last synced time, ThemeToggle, AccountDropdown) + main content area
```

## Pages

| Route | Page | Storage | Description |
|-------|------|---------|-------------|
| `/` | Overview | API | Daily checklist, KPI cards, activity calendar, recent trades, strategy/mistakes summaries — time-range filtered |
| `/diary/pre-session` | Pre-Session | API (DB) | Daily checklist: energy, mindset, limits, market context, rules |
| `/diary/post-session` | Post-Session | API (DB) | End-of-day review: rating, emotions, lessons, rules adherence, plan for tomorrow |
| `/diary/notes` | Notes | API (DB) | General notes with title, content, and tags |
| `/trade-journal` | Trade Journal | API (DB) | Trade cycles table with JournalModal for per-cycle notes |
| `/history` | History | API (DB) | 3 tabs: Transactions (API), Pre-Sessions (API), Journal (API) |
| `/chart-lab` | Chart Lab | API | Advanced charts: calendar P/L, distribution, equity curve, holding time — sub-routed |
| `/analytics` | Analytics | API | Recharts: cumulative P/L, duration, hours, discipline — time-range filtered |
| `/missed-trades` | Missed Trades | API (DB) | Track tokens you saw but didn't trade, with potential multiplier |
| `/strategies` | Strategies | API (DB) | Named strategies (entry/exit/stop-loss conditions) + global rules |
| `/wallet-management` | Wallet Mgmt | localStorage | Add/remove/switch saved wallets |
| `/settings` | Settings | API (DB) | Display name, timezone, trading start time, journal view mode, trade comments |

## Key Components

| Component | File | Description |
|-----------|------|-------------|
| `SyncButton` | `components/SyncButton.tsx` | Sync all active wallets + shows "last synced X ago" relative time |
| `AppSidebar` | `components/app-sidebar.tsx` | Sidebar nav with wallet display, pre-session status dot (reads from MetadataContext) |
| `DailyChecklist` | `components/overview/DailyChecklist.tsx` | Gamified 3-item checklist (pre-session, post-session, journals) with progress bar |
| `ActivityCalendar` | `components/overview/ActivityCalendar.tsx` | GitHub-style yearly heatmap with 0-5 activity score per day |
| `KPICards` | `components/overview/KPICards.tsx` | 7-card horizontal strip (P/L, win rate, profit factor, avg P/L, trades, Sharpe, streak) |
| `RecentCycles` | `components/overview/RecentCycles.tsx` | Last 8 completed trades with journal status |
| `StrategySummary` | `components/overview/StrategySummary.tsx` | Best strategy performance + rule compliance |
| `MistakesSummary` | `components/overview/MistakesSummary.tsx` | Discipline score + top mistakes + emotion tags |
| `QuickStatsBar` | `components/overview/QuickStatsBar.tsx` | Horizontal stats bar (avg win/loss, best hour, top token, streaks) |
| `TimeRangeFilter` | `components/TimeRangeFilter.tsx` | Shared time filter: 1D/7D/30D/90D/All presets + custom date range picker |
| `TradesTable` | `components/TradesTable.tsx` | Paginated raw transaction table (50/page) |
| `JournalModal` | `components/JournalModal.tsx` | Dialog for journaling buy/sell analysis per trade cycle |
| `TransactionModal` | `components/TransactionModal.tsx` | Dialog showing individual txs in a trade cycle |
| `ErrorBoundary` | `components/ErrorBoundary.tsx` | React error boundary with dev stack trace |
| `Providers` | `components/Providers.tsx` | Supabase SessionProvider wrapper |
| `StaleDataBanner` | `components/StaleDataBanner.tsx` | Amber banner shown when trade data is served from stale cache |
| `LocalStorageMigration` | `components/LocalStorageMigration.tsx` | One-time migration of localStorage data to database |

Legacy (not used in dashboard): `SummaryView.tsx`

## Lib Modules

| Module | Exports | Description |
|--------|---------|-------------|
| `wallet-context.tsx` | `WalletProvider`, `useWallet`, `useMetadata` | Barrel re-export of split contexts; `useWallet()` for compat, `useMetadata()` for metadata-only |
| `trading-day.ts` | `getTradingDay`, `getCalendarDate`, `getTradingDayForDate` | Timezone-aware trading day calculation; respects user's timezone + trading start time |
| `time-filters.ts` | `TimePreset`, `TimeRange`, `presetToRange`, `filterTradesByRange` | Shared time filter types + utilities (client and server) |
| `solana-tracker.ts` | `isValidSolanaAddress`, `getWalletTrades`, `getWalletTokens`, `getTokenData` | Solana Tracker API client; browser requests proxy through `/api/solana/*` |
| `tradeCycles.ts` | `TradeInput`, `calculateTradeCycles`, `flattenTradeCycles` | Groups txs by token → splits into buy/sell cycles by balance; `TradeInput` is the typed trade shape used across API routes |
| `contexts/` | `DashboardProviders`, `WalletIdentityContext`, `TradeContext`, `MetadataContext`, `BalanceContext` | Split context: identity, trades, metadata (strategies/journals/streak/time-filter/pre-session/post-session/missed-trades), balances |
| `analytics.ts` → `analytics/` | Re-export barrel; modules: `core`, `calendar`, `time`, `discipline`, `what-if`, `patterns`, `strategy`, `missed-trades`, `types`, `helpers` | Analytics computation split by domain |
| `server/resolve-trades.ts` | `resolveFlattenedTrades`, `applyDateFilter`, `parseWalletParams`, `sanitizeForJSON` | Server-side trade resolution with TTL cache, dedup, date filtering |
| `local-storage.ts` | `safeLocalStorage` | Safe localStorage wrapper with quota error handling and toast notifications |
| `strategies.ts` | `loadStrategies`, `createStrategy`, `updateStrategy`, `deleteStrategy` | Async strategy CRUD via API |
| `trade-comments.ts` | `loadTradeComments`, `getCommentsByCategory`, `getCommentById` | Async trade comment loading + pure helpers |
| `rules.ts` | `loadRules`, `createRule`, `updateRule`, `deleteRule` | Async global rule CRUD via API |
| `pre-sessions.ts` | `loadPreSessions`, `loadPreSession`, `savePreSession` | Async pre-session CRUD via API |
| `post-sessions.ts` | `loadPostSessions`, `loadPostSession`, `savePostSession` | Async post-session CRUD via API |
| `journals.ts` | `loadJournals`, `saveJournal` | Async journal entry CRUD via API |
| `notes.ts` | `NoteData`, `loadNotes`, `createNote`, `updateNote`, `deleteNote` | Notes types and async API helpers |
| `chains.ts` | `Chain`, `ChainConfig`, chain configs | Multi-chain config (solana, base, bnb) with address patterns and token lists |
| `constants.ts` | `APP_FEE_RATES` | Shared constants (DEX/app fee rates) used by client and server |
| `discipline.ts` | `ratingToScore`, `DisciplineResult` | Discipline scoring from trade comments and journal ratings |
| `streaks.ts` | `StreakResult`, streak computation | Journaling streak calculation (current + longest) |
| `formatters.ts` | `formatDuration`, `formatTime`, `formatValue`, `formatTokenAmount`, `formatMarketCap`, `formatPrice`, `formatPercentage` | Display formatting |
| `utils.ts` | `cn` | Tailwind class merge (clsx + tailwind-merge) |
| `auth-helper.ts` | `requireAuth`, `getAuthUser`, `ensureUserExists` | Server-side auth helper (Supabase session check, returns userId or 401) |
| `supabase-auth.ts` | `supabaseAuth` | Client-side Supabase auth (signIn, signOut with localStorage cleanup, getSession) |
| `validations.ts` | Zod schemas + `validateBody` | Input validation for all POST/PATCH API endpoints |
| `prisma.ts` | `prisma` | Prisma client singleton |
| `zerion.ts` | `getWalletTrades` | Zerion API client for EVM chains (Base, BNB) |

## API Routes

### Active

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/dashboard?addresses=&chains=&dexes=` | Session | Combined endpoint: trades, strategies, journals, comments, streak, pre-session + post-session status, missed trades |
| GET | `/api/trades?address=&refresh=` | Session | Fetch trades with 5-min DB cache, fallback to stale |
| GET | `/api/analytics/overview?...&startDate=&endDate=` | Session | Cumulative P/L, duration buckets, trading hours |
| GET | `/api/analytics/calendar?...&year=&month=` | Session | Monthly P/L calendar data |
| GET | `/api/analytics/time?...&startDate=&endDate=` | Session | Hourly, day-of-week, session performance |
| GET | `/api/analytics/missed?...` | Session | Missed trade stats + hesitation cost |
| POST | `/api/analytics/discipline?...` | Session | Comment performance, efficiency, what-if analysis |
| POST | `/api/analytics/strategy?...` | Session | Strategy performance, rule impact |
| GET | `/api/papered-plays` | Session | List missed trades |
| POST | `/api/papered-plays` | Session | Create missed trade entry |
| DELETE/PATCH | `/api/papered-plays/[id]` | Session | Delete/update missed trade |
| GET/POST | `/api/rules` | Session | List/create global rules |
| PATCH/DELETE | `/api/rules/[id]` | Session | Update/delete global rule |
| GET/POST | `/api/trade-comments` | Session | List (auto-seeds defaults)/create trade comments |
| PATCH/DELETE | `/api/trade-comments/[id]` | Session | Update/delete trade comment |
| GET/POST | `/api/strategies` | Session | List/create strategies |
| GET/PATCH/DELETE | `/api/strategies/[id]` | Session | Get/update/delete strategy |
| GET/POST | `/api/pre-sessions` | Session | List/upsert pre-sessions (supports `from`/`to` date range) |
| GET/DELETE | `/api/pre-sessions/[date]` | Session | Get/delete pre-session by date |
| GET/POST | `/api/post-sessions` | Session | List/upsert post-sessions (supports `from`/`to` date range) |
| GET/DELETE | `/api/post-sessions/[date]` | Session | Get/delete post-session by date |
| GET/POST | `/api/journals` | Session | List/upsert journal entries |
| GET/DELETE | `/api/journals/[id]` | Session | Get/delete journal entry |
| GET/POST | `/api/notes` | Session | List/create notes |
| GET/PATCH/DELETE | `/api/notes/[id]` | Session | Get/update/delete note |
| GET/PATCH | `/api/settings` | Session | User preferences (incl. timezone, tradingStartTime) |
| GET/POST | `/api/wallets` | Session | List/create wallets |
| DELETE/PATCH | `/api/wallets/[id]` | Session | Delete/update wallet |
| GET/POST/DELETE | `/api/trade-edits` | Session | Trade edit overrides |
| POST | `/api/manual-trades` | Session | Create manual trade entries |
| GET | `/api/evm/wallet/[address]/*` | No | EVM wallet data proxy |
| GET | `/api/solana/wallet/[address]/trades` | No | Proxy to Solana Tracker trades API |
| GET | `/api/solana/wallet/[address]/balances` | No | Proxy to Solana Tracker balances API |
| GET | `/api/solana/token/[mint]` | No | Proxy to Solana Tracker token data |
| POST | `/api/auth/sync-user` | Session | Sync authenticated Supabase user to DB |

## Data Storage

### localStorage Keys

| Key | Used By | Content |
|-----|---------|---------|
| `journalio_saved_wallets` | Wallet Management | Saved wallet objects |
| `journalio_journal_view_mode` | Settings, Trade Journal | Journal view mode preference (merged/grouped) |
| `journalio_migration_v1_complete` | LocalStorageMigration | Flag indicating one-time migration is done |

**Migrated to DB (Phase 3)**: strategies, rules, pre-sessions, journals, trade comments — legacy localStorage keys still read by `LocalStorageMigration` component for one-time migration.

### Database (Prisma)

Models: `User`, `Account`, `Session`, `Wallet`, `Trade`, `TradeEdit`, `PaperedPlay`, `UserSettings`, `VerificationToken`, `Strategy`, `GlobalRule`, `PreSession`, `PostSession`, `JournalEntry`, `TradeComment`, `Note`

Trade cache: 5-minute TTL on `Trade.indexedAt`, force refresh bypasses cache, stale fallback on API failure. `Trade.signature` is unique per wallet (`@@unique([walletId, signature])`), allowing multiple users to store the same blockchain transactions. Storage uses batched `createMany` (200/batch) with `skipDuplicates: true`.

Dashboard data flow: `/api/dashboard` returns trades + strategies + journals + comments + streak + pre-session status + post-session status + missed trades in one call. Uses timezone-aware `getTradingDay()` to determine "today". `MetadataContext` holds pre-session/post-session status, missed trades, time range filter, and provides reload callbacks. `AppSidebar` reads from context (no individual fetches).

Analytics data flow: 6 server-side endpoints (`/api/analytics/*`) accept optional `startDate`/`endDate` query params (UNIX seconds). `applyDateFilter()` in `lib/server/resolve-trades.ts` filters after trade resolution. SWR hooks in `lib/hooks/use-analytics.ts` auto-refetch when URL params change.

### Trading Day / Timezone

- `UserSettings.timezone` (IANA string, default "UTC") and `UserSettings.tradingStartTime` (HH:mm, default "09:00") control when a new trading day begins
- `lib/trading-day.ts` provides `getTradingDay(timezone, tradingStartTime)` — if current time is before start time, returns previous calendar day
- Dashboard API, pre-session page, post-session page, and context reload callbacks all use this to determine "today"
- Settings page has a searchable timezone combobox and time input

### Home Page Layout

```
Row 1: Header + TimeRangeFilter
Row 2: DailyChecklist (pre-session, post-session, journals — gamified with progress bar)
Row 3: KPICards (7 metrics)
Row 4: RecentCycles (left 3 cols) + ActivityCalendar (right 2 cols)
Row 5: StrategySummary + MistakesSummary
Row 6: QuickStatsBar
```

### Activity Calendar Scoring (0-5 per day)

| Metric | Score |
|--------|-------|
| Traded | +1 |
| Pre-session done | +1 |
| Post-session done | +1 |
| All trades journaled | +1 |
| Rule adherence >= 70% | +1 |

Color: emerald scale from zinc-800 (0) to emerald-400 (5).

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
npm run lint         # Next.js linting
npm run test         # Run Jest tests
npm run test:watch   # Jest watch mode
npm run test:coverage # Jest with coverage report
npx prisma studio    # Database GUI
npx prisma migrate dev --name <name>  # Create migration
npx prisma generate  # Regenerate client after schema change
```

### Environment Variables

```env
# Supabase Auth
NEXT_PUBLIC_SUPABASE_URL=     # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY= # Supabase anon key
SUPABASE_SERVICE_ROLE_KEY=    # Supabase service role key

# Database (Supabase PostgreSQL)
DATABASE_URL=                 # Pooled connection (port 6543, ?pgbouncer=true) for runtime
DIRECT_URL=                   # Direct connection (port 5432) for migrations

# APIs
SOLANA_TRACKER_API_KEY=       # Server-side Solana Tracker API key
ZERION_API_KEY=               # Zerion API key (EVM chains)
```

### Deployment (Vercel)

- Build command: `prisma generate && next build` (cannot run `migrate deploy` at build time — Vercel serverless can't reach DB during build)
- `postinstall` script runs `prisma generate` for Vercel
- Migrations must be applied separately via `npx prisma migrate deploy` with `DIRECT_URL`
- Serverless functions use Supabase connection pooler (port 6543) to avoid connection exhaustion
- `maxDuration = 60` on `/api/trades` and `/api/dashboard` routes for large wallet fetches
- Trade storage batched in 200-row chunks to avoid pgBouncer statement timeouts

### Performance Notes
- `instrumentation.ts` only loads Sentry in production (`NODE_ENV === 'production'`) to avoid `@prisma/instrumentation` warnings in dev
- `next.config.js` sets `outputFileTracingRoot` to prevent workspace root misresolution
- `/api/wallets` uses a module-level flag to skip `ensureDefaultUser()` upsert after first call
- Pre-session page useEffect has a `stale` cleanup guard for React StrictMode double-mount

---
<!-- Auto-updated by post-commit hook -->
Last updated: 2026-03-05

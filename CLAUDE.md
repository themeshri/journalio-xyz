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
| `/` | Overview | API | Stat cards (cycles, win rate, P/L) + 10 recent transactions |
| `/pre-session` | Pre-Session | localStorage | Daily checklist: energy, mindset, limits, market context, rules |
| `/trade-journal` | Trade Journal | localStorage | Trade cycles table with JournalModal for per-cycle notes |
| `/history` | History | Mixed | 3 tabs: Transactions (API), Pre-Sessions (localStorage), Journal (localStorage) |
| `/analytics` | Analytics | API | Recharts: cumulative P/L, duration buckets, trading hours heatmap |
| `/missed-trades` | Missed Trades | API (DB) | Track tokens you saw but didn't trade, with potential multiplier |
| `/strategies` | Strategies | localStorage | Named strategies (entry/exit/stop-loss conditions) + global rules |
| `/wallet-management` | Wallet Mgmt | localStorage | Add/remove/switch saved wallets |
| `/settings` | Settings | API (DB) | Display name, tx limit, USD toggle |

## Key Components

| Component | File | Description |
|-----------|------|-------------|
| `AppSidebar` | `components/app-sidebar.tsx` | Sidebar nav with wallet display, pre-session status dot |
| `TradesTable` | `components/TradesTable.tsx` | Paginated raw transaction table (50/page) |
| `JournalModal` | `components/JournalModal.tsx` | Dialog for journaling buy/sell analysis per trade cycle |
| `TransactionModal` | `components/TransactionModal.tsx` | Dialog showing individual txs in a trade cycle |
| `ErrorBoundary` | `components/ErrorBoundary.tsx` | React error boundary with dev stack trace |
| `Providers` | `components/Providers.tsx` | NextAuth SessionProvider wrapper |
| `StaleDataBanner` | `components/StaleDataBanner.tsx` | Amber banner shown when trade data is served from stale cache |

Legacy (not used in dashboard): `WalletInput.tsx`, `TransactionList.tsx`, `PaperedPlays.tsx`, `SummaryView.tsx`, `TradeCycleCard.backup.tsx`, `SkeletonLoading.tsx`

## Lib Modules

| Module | Exports | Description |
|--------|---------|-------------|
| `wallet-context.tsx` | `WalletProvider`, `useWallet` | Cross-page wallet state, URL `?wallet=` sync, trade fetching |
| `solana-tracker.ts` | `isValidSolanaAddress`, `getWalletTrades`, `getWalletTokens`, `getTokenData` | Solana Tracker API client; browser requests proxy through `/api/solana/*` |
| `tradeCycles.ts` | `calculateTradeCycles`, `flattenTradeCycles` | Groups txs by token → splits into buy/sell cycles by balance |
| `analytics.ts` → `analytics/` | Re-export barrel; modules: `core`, `calendar`, `time`, `discipline`, `what-if`, `patterns`, `strategy`, `missed-trades`, `types`, `helpers` | Analytics computation split by domain |
| `local-storage.ts` | `safeLocalStorage` | Safe localStorage wrapper with quota error handling and toast notifications |
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
| GET | `/api/trades?address=&refresh=` | No | Fetch trades with 5-min DB cache, fallback to stale |
| GET | `/api/papered-plays` | No | List missed trades (default-user) |
| POST | `/api/papered-plays` | No | Create missed trade entry |
| DELETE/PATCH | `/api/papered-plays/[id]` | No | Delete/update missed trade |
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
| `journalio_strategies` | Strategies page | Array of strategy objects |
| `journalio_rules` | Strategies page, Pre-Session, Sidebar | Array of rule objects |
| `journalio_pre_session_{YYYY-MM-DD}` | Pre-Session, History | Full pre-session data for a date |
| `journalio_pre_sessions` | Pre-Session, History, Sidebar | Index of pre-session summaries |
| `journalio_journal_{wallet}_{mint}_{tradeNum}` | Trade Journal, History | Journal entry per trade cycle |
| `journalio_saved_wallets` | Wallet Management | Saved wallet objects |

### Database (Prisma)

Models: `User`, `Account`, `Session`, `Wallet`, `Trade`, `TradeEdit`, `PaperedPlay`, `UserSettings`, `VerificationToken`

Trade cache: 5-minute TTL on `Trade.indexedAt`, force refresh bypasses cache, stale fallback on API failure.

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

---
<!-- Auto-updated by post-commit hook -->
Last updated: 2026-02-20

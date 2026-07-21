# Journalio — Solana Trading Journal

<!-- UPDATE THIS FILE when adding new pages, components, or lib modules. -->
<!-- UPDATE FEATURES.md when adding or changing any user-facing feature. -->
<!-- Run `bash scripts/update-claude-md.sh` to see current project structure. -->

## Overview

Solana trading journal with pre-session checklists, post-session reviews, trade cycle analysis, strategy management, and missed trade tracking. Dashboard-based UI with sidebar navigation. Session hero card and GitHub-style activity calendar on the home page.

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

App Router under `app/`, with a `(dashboard)` route group holding the authenticated pages and `app/api/` for routes. Run `bash scripts/update-claude-md.sh` to print the current structure.

### Layout Hierarchy

```
RootLayout (fonts, ErrorBoundary, Providers/SessionProvider)
  └── DashboardLayout (Suspense → WalletProvider → SidebarProvider)
        ├── AppSidebar (nav links, active wallet display, dark mode toggle, collapse)
        └── SidebarInset → header (GlobalFilterBar, SyncButton + last synced time, ThemeToggle, AccountDropdown) + main content area
```

## Pages

Routes map to directories under `app/(dashboard)/`. Most pages are DB-backed via `/api/*`; **exceptions**: `/wallet-management` and the journal view-mode preference use localStorage (see Data Storage). `/chart-lab` and `/analytics` are read-only analytics; `/settings` covers display name, timezone, trading start time, journal view mode, and trade comments.

## Key Components

Components live in `components/` (shared) and `components/overview/` (home-page cards). Non-obvious ones worth knowing: `SessionHero`/`SessionPills` (tabbed Pre/Active/Post session card), `ActivityCalendar` (GitHub-style 0–5 daily heatmap — see scoring below), `StaleDataBanner` (renders when trade data is served from stale cache), `LocalStorageMigration` (one-time localStorage→DB migration). Legacy, not used in dashboard: `SummaryView.tsx`.

## Lib Modules

`lib/` holds the API clients, contexts, and helpers. Non-obvious structure and gotchas:
- `wallet-context.tsx` is a **barrel re-export** of split contexts in `lib/contexts/`; `useWallet()` is the compat accessor, `useMetadata()` is metadata-only. The split contexts are `WalletIdentityContext`, `TradeContext`, `MetadataContext`, `BalanceContext`.
- `trading-day.ts` — timezone-aware trading-day calc (see Trading Day section for the rationale).
- `solana-tracker.ts` — browser requests **must** proxy through `/api/solana/*` (the API key is server-only); `zerion.ts` is the EVM (Base/BNB) equivalent.
- `analytics.ts` is a re-export barrel over `lib/analytics/` (`core`, `calendar`, `time`, `discipline`, `what-if`, `patterns`, `strategy`, `missed-trades`).
- `local-storage.ts` exports `safeLocalStorage` — **all** localStorage writes must go through it (see Error Handling).
- `validations.ts` (Zod + `validateBody`) validates every POST/PATCH body; `rate-limit.ts` provides `rateLimit`/`rateLimitByUser`; `env.ts` `validateEnv()` runs from `instrumentation.ts`.

## Security

### Rate Limiting
- Proxy routes (`/api/solana/*`, `/api/evm/*`): 30 req/min per IP via `rateLimit()`
- Auth sync (`/api/auth/sync-user`): 10 req/min per IP
- Expensive endpoints (`/api/trades`, `/api/dashboard`): 30 req/min per user via `rateLimitByUser()`
- In-memory per-instance store (no external dependency); sufficient for serverless abuse protection

### Auth & Multi-Tenancy
- All `[id]` routes verify ownership (`userId` match) and return 404 (not 403) to prevent resource enumeration
- `requireAuth()` validates Supabase session server-side on all authenticated endpoints
- All DB queries scoped by `userId`

### Headers
- Security headers in `next.config.js`: X-Frame-Options DENY, HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, Content-Security-Policy
- CSP allows `connect-src` to `self` + Supabase + Solana Tracker + Zerion APIs only

### Error Handling
- API routes return generic error messages to clients; internal details logged server-side only
- Environment variables validated at startup via `lib/env.ts` in `instrumentation.ts`

## API Routes

Routes live under `app/api/`; methods and paths are self-describing there. What's **not** obvious from the file tree:

- **Auth**: every route requires a Supabase session **except** the proxies — `/api/solana/*`, `/api/evm/*` (unauthenticated on purpose; they hide the server-side API keys). `/api/auth/sync-user` syncs the authenticated user to the DB.
- **`/api/dashboard`** is a **combined** endpoint returning trades + strategies + journals + comments + streak + pre/post-session status + missed trades in one call (see Dashboard data flow).
- **`/api/trades`** has 5-min DB cache with stale fallback; `refresh=true` bypasses it.
- **`/api/analytics/*`** (6 endpoints) accept optional `startDate`/`endDate` (UNIX seconds).
- **`/api/trade-comments`** auto-seeds defaults on first GET.
- `pre-sessions`/`post-sessions` support `from`/`to` ranges and have `[date]`-keyed sub-routes.
- `[id]` sub-routes verify ownership and return **404** (not 403) — see Security.

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
Row 1: Header + SessionPills + TimeRangeFilter
Row 2: SessionHero (tabbed: Pre-Session/Active/Post-Session with session-scoped stats)
Row 3: KPICards (7 metrics)
Row 4: RecentCycles (left 3 cols) + Evaluation (right 2 cols)
Row 5: ActivityCalendar (full width)
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

Standard scripts (`dev`, `build`, `lint`, `test`, `test:watch`, `test:coverage`) — see `package.json`. Prisma: `npx prisma studio`, `npx prisma migrate dev --name <name>`, `npx prisma generate`. Required env vars are in `.env.example`; note `DATABASE_URL` is the pooled connection (port 6543, `?pgbouncer=true`) and `DIRECT_URL` is direct (port 5432, migrations only).

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
Last updated: 2026-03-09

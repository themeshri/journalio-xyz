# Journalio — Solana Trading Journal

<!-- UPDATE THIS FILE when adding new pages, components, or lib modules. -->
<!-- UPDATE FEATURES.md when adding or changing any user-facing feature. -->
<!-- Run `bash scripts/update-claude-md.sh` to see current project structure. -->

## Overview

Solana trading journal with pre-session checklists, post-session reviews, trade cycle analysis, strategy management, and missed trade tracking. Dashboard-based UI with sidebar navigation. Session hero card and GitHub-style activity calendar on the home page.

## App Structure

App Router under `app/`, with a `(dashboard)` route group holding the authenticated pages and `app/api/` for routes. Run `bash scripts/update-claude-md.sh` to print the current structure. Stack details are in `package.json`, `components.json`, and `prisma/schema.prisma`.

### Layout Hierarchy

`RootLayout` → `DashboardLayout` → `ProductRail` + `AppSidebar` + `SidebarInset`
(see `app/layout.tsx` and `app/(dashboard)/layout.tsx`).

**Two-level navigation.** `lib/nav-structure.ts` is the single source for both
levels: `PRODUCTS` drives `ProductRail`, `PRODUCT_SECTIONS` drives `AppSidebar`,
and `productForPath()` resolves the active product (longest prefix match).
Adding a page means adding one entry there — `nav-structure.test.ts` asserts
every section link resolves back to its own product.

**Gotcha:** the rail sits beside shadcn's `fixed left-0` sidebar via a
`--sidebar-offset` CSS variable set in `app/(dashboard)/layout.tsx` and read in
`components/ui/sidebar.tsx`. That's a local edit to a generated file — re-running
`shadcn add sidebar` would revert it and hide the rail.

## Pages

Routes map to directories under `app/(dashboard)/`. Most pages are DB-backed via `/api/*`; **exception**: the journal view-mode preference uses localStorage (see Data Storage). `/chart-lab` and `/analytics` are read-only analytics; `/settings` covers display name, timezone, trading start time, journal view mode, and trade comments.

Note: **global rules are managed on `/strategies` (anchor `#rules`), not `/settings`** — the Progress Tracker's "Edit rules" CTA points there. `/progress-tracker` is the rule streak / follow-rate surface; `/analytics/compare` and `/analytics/drawdown` are the two newer report pages.

## Key Components

Components live in `components/` (shared), `components/overview/` (home-page cards) and `components/nav/` (product rail). Non-obvious ones worth knowing: `SessionHero`/`SessionPills` (tabbed Pre/Active/Post session card), `ActivityCalendar` (GitHub-style 0–5 daily heatmap — see scoring below), `StaleDataBanner` (renders when trade data is served from stale cache), `LocalStorageMigration` (one-time localStorage→DB migration), `ViewMyDayButton` (the repeated daily-review entry point; opens `DayDetailModal` for today), `DayDetailModal` (the single day-review surface — reached from the calendars and from `ViewMyDayButton`). Legacy, not used in dashboard: `SummaryView.tsx`.

## Lib Modules

`lib/` holds the API clients, contexts, and helpers. Non-obvious structure and gotchas:
- `wallet-context.tsx` is a **barrel re-export** of split contexts in `lib/contexts/`; `useWallet()` is the compat accessor, `useMetadata()` is metadata-only. The split contexts are `WalletIdentityContext`, `TradeContext`, `MetadataContext`, `BalanceContext`.
- `trading-day.ts` — timezone-aware trading-day calc (see Trading Day section for the rationale).
- `solana-tracker.ts` — browser requests **must** proxy through `/api/solana/*` (the API key is server-only); `zerion.ts` is the EVM (Base/BNB) equivalent.
- `analytics.ts` is a re-export barrel over `lib/analytics/` (`core`, `calendar`, `time`, `discipline`, `what-if`, `patterns`, `strategy`, `missed-trades`, `rule-stats`, `r-multiple`, `drawdown`).
- `local-storage.ts` exports `safeLocalStorage` — **all** localStorage writes must go through it (see Error Handling).
- `validations.ts` (Zod + `validateBody`) validates every POST/PATCH body; `rate-limit.ts` provides `rateLimit`/`rateLimitByUser`; `env.ts` `validateEnv()` runs from `instrumentation.ts`.
- `rules-engine.ts` — pure, I/O-free evaluation of typed rules against a day (see Typed Rules below). `lib/server/adherence.ts` is the DB-writing wrapper shared by `/api/rules/adherence` and `/api/dashboard`.
- `trade-filters.ts` — the shared filter vocabulary. `applyDateFilter` in `lib/server/resolve-trades.ts` is a thin wrapper over it, so the six `/api/analytics/*` routes keep their exact previous behaviour (pinned by `trade-filters.test.ts`).
- `nav-structure.ts` — the two-level nav definition (see Layout Hierarchy).

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
- Security headers and CSP live in `next.config.js`. CSP `connect-src` is an allowlist — adding an external API means editing it there too.

### Error Handling
- API routes return generic error messages to clients; internal details logged server-side only
- Environment variables validated at startup via `lib/env.ts` in `instrumentation.ts`

## API Routes

Routes live under `app/api/`; methods and paths are self-describing there. What's **not** obvious from the file tree:

- **Auth**: every route requires a Supabase session **except** the proxies — `/api/solana/*`, `/api/evm/*` (unauthenticated on purpose; they hide the server-side API keys). `/api/auth/sync-user` syncs the authenticated user to the DB.
- **`/api/dashboard`** is a **combined** endpoint returning trades + strategies + journals + comments + streak + pre/post-session status + missed trades + rules + adherence + ruleStats + tags in one call (see Dashboard data flow). Add new dashboard data to its batched `Promise.all` rather than introducing a client fetch — `AppSidebar` and the contexts read from `MetadataContext`.
- **`/api/trades`** has 5-min DB cache with stale fallback; `refresh=true` bypasses it.
- **`/api/analytics/*`** (9 endpoints) accept optional `startDate`/`endDate` (UNIX seconds). `compare` additionally reads two namespaced filter sets (`a.*` / `b.*`); `drawdown` returns `hasInitialBalance: false` when no wallet has one set, so the UI can name what's missing.
- **`/api/trade-comments`** and **`/api/tags`** auto-seed defaults on first GET.
- **`/api/tags/[id]` DELETE archives rather than deletes** when the tag is in use — hard-deleting would cascade away `JournalEntryTag` rows and silently rewrite history in the mistake-cost report.
- `pre-sessions`/`post-sessions` support `from`/`to` ranges and have `[date]`-keyed sub-routes.
- `[id]` sub-routes verify ownership and return **404** (not 403) — see Security.

## Data Storage

### localStorage Keys

Keys are prefixed `journalio_` — grep for it. Only one is non-obvious:
`journalio_active_wallets` is a **fallback only**; `?wallets=` in the URL wins
when present (see below).

**Migrated to DB (Phase 3)**: strategies, rules, pre-sessions, journals, trade comments — legacy localStorage keys still read by `LocalStorageMigration` component for one-time migration.

### Filter state in the URL

Analytics views are shareable and back-button-correct because filter state lives
in the query string, not in context:
- `GlobalFilterBar` writes `outcome` / `month` / `day` / `search` / `minPl` / `maxPl` / `lastN`
- `?wallets=solana:addr,base:addr` carries the wallet selection
  (`lib/hooks/use-wallet-url-sync.ts`). The URL wins when present; localStorage
  is the cold-load fallback and is kept in sync. A link naming wallets the
  viewer doesn't have falls back to all wallets rather than blanking the page.
- Compare namespaces two independent cohorts as `a.*` and `b.*`

`lib/trade-filters.ts` parses and applies all of it; `parseTradeFilters` takes a
prefix so the same code reads both Compare cohorts.

### Database (Prisma)

Models are in `prisma/schema.prisma`.

**Grading fields live on `JournalEntry`, not `Trade`.** `Trade` is an immutable
on-chain swap row wiped and refetched by the 5-min sync cache, and a P&L "trade"
is a *cycle* derived at read time by `lib/tradeCycles.ts` — so it has no stable
row to hang user data on. `rMultiple`, `tradeRating` and `reviewed` are therefore
on `JournalEntry`, which is already keyed per cycle. `Note` trade-links mirror
that same composite key (`walletAddress` + `tokenMint` + `tradeNumber`) for the
same reason.

Trade cache: 5-minute TTL on `Trade.indexedAt`, force refresh bypasses cache, stale fallback on API failure. `Trade.signature` is unique per wallet (`@@unique([walletId, signature])`), allowing multiple users to store the same blockchain transactions. Storage uses batched `createMany` (200/batch) with `skipDuplicates: true`.

Dashboard data flow: `/api/dashboard` returns trades + strategies + journals + comments + streak + pre-session status + post-session status + missed trades in one call. Uses timezone-aware `getTradingDay()` to determine "today". `MetadataContext` holds pre-session/post-session status, missed trades, time range filter, and provides reload callbacks. `AppSidebar` reads from context (no individual fetches).

Analytics data flow: 6 server-side endpoints (`/api/analytics/*`) accept optional `startDate`/`endDate` query params (UNIX seconds). `applyDateFilter()` in `lib/server/resolve-trades.ts` filters after trade resolution. SWR hooks in `lib/hooks/use-analytics.ts` auto-refetch when URL params change.

### Trading Day / Timezone

- `UserSettings.timezone` (IANA string, default "UTC") and `UserSettings.tradingStartTime` (HH:mm, default "09:00") control when a new trading day begins
- `lib/trading-day.ts` provides `getTradingDay(timezone, tradingStartTime)` — if current time is before start time, returns previous calendar day
- Dashboard API, pre-session page, post-session page, and context reload callbacks all use this to determine "today"
- Settings page has a searchable timezone combobox and time input

### Activity Calendar Scoring (0-5 per day)

| Metric | Score |
|--------|-------|
| Traded | +1 |
| Pre-session done | +1 |
| Post-session done | +1 |
| All trades journaled | +1 |
| Rule adherence >= 70% | +1 |

Color: emerald scale from zinc-800 (0) to emerald-400 (5).

Each point is tracked individually (`ActivityDay.points`) so the tooltip names
which were earned and which were missed. "Rule adherence" reads real
`RuleAdherence` rows when present, falling back to per-trade strategy rule
results otherwise.

### Typed Rules & Adherence

`GlobalRule` carries a `type` (`manual | time | percentage | currency | count`)
and a `condition` (`"09:30"`, `"100"`, `"5"`). `lib/rules-engine.ts` evaluates
each rule against a trading day and `RuleAdherence` persists one row per
(user, rule, day) with the observed `actual` value — that's what renders the
`09:26 / 09:30` display on the Progress Tracker.

Two invariants worth preserving:
- **A manual override is never clobbered by auto-evaluation.** Rows with
  `source: "manual"` are skipped when re-evaluating (`lib/server/adherence.ts`).
- **An unevaluable rule writes no row at all.** An absent row means "not
  measured", which is different from "broken" — the day score counts only
  evaluated rules in its denominator.

`GET /api/rules/adherence` backfills recent trading days before returning, so
streaks reflect real history rather than only accumulating from first use.

### Tag Namespaces

`TradeTag.kind` splits `mistake` from `custom`. This is what makes "what is
costing me money" a plain aggregation (`computeTagCost`) rather than a text
search. `MistakesSummary` ranks by **$ cost, not frequency**.

Migration state: `JournalEntry.sellMistakesJson` is still read as a fallback for
journals written before tags existed. It is dual-written and will be dropped
once the backfill (`npm run backfill:tags`) is confirmed in production.

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

One-off data scripts (all support `--dry-run`, all idempotent):
- `npm run backfill:tags` — legacy `sellMistakesJson` → `TradeTag` + join rows, and seeds the default mistake tags
- `npm run seed:templates` — `lib/strategy-templates.ts` → `Strategy` rows with `isTemplate: true`, owned by a system user

**Migration fallback.** If `prisma migrate` fails with `P1001`, see the
`prisma-migrate` skill in `.claude/skills/` for the workaround.

**Do not run `npm run build` while `npm run dev` is running** — the build wipes
`.next` out from under the dev server and every route 500s until you restart it.

### Deployment (Vercel)

- Migrations **cannot** run at build time — Vercel serverless can't reach the DB during build. Apply them separately via `npx prisma migrate deploy` with `DIRECT_URL`.
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

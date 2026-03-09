# Journalio — Features & Functionality

<!-- This file is auto-timestamped on every commit via .git/hooks/post-commit. -->
<!-- When adding or changing features, update the relevant section below. -->

Last updated: 2026-03-09

---

## Table of Contents

1. [Overview Dashboard](#1-overview-dashboard)
2. [Pre-Session Checklist](#2-pre-session-checklist)
3. [Post-Session Review](#3-post-session-review)
4. [Notes](#4-notes)
5. [Trade Journal](#5-trade-journal)
6. [History](#6-history)
7. [Analytics](#7-analytics)
8. [Missed Trades](#8-missed-trades)
9. [Strategies](#9-strategies)
10. [Wallet Management](#10-wallet-management)
11. [Settings](#11-settings)
12. [API Endpoints](#12-api-endpoints)
13. [Core Libraries](#13-core-libraries)
14. [Data Storage](#14-data-storage)

---

## 1. Overview Dashboard

**Route:** `/`

### Session Hero Card

| Feature | Description |
|---------|-------------|
| Segmented pills | Pre-Session / Active / Post-Session tabs in header row, auto-selects current state, allows manual override |
| Pre-Session tab | Blue gradient; shows trading day date; CTA to start or "complete" with view/edit link |
| Active tab | Green gradient; session timer (from pre-session savedAt), session intent, global rules (up to 5), session-scoped stats (trades, P/L, journal progress — only trades after session start); CTAs to journal trade or end session |
| Post-Session tab | Amber/emerald gradient; CTA to start post-session, "wrap up" for unjournaled trades, or "all done" state |

### KPI Cards (7 metrics)

| Card | Description |
|------|-------------|
| Net P/L | Total profit/loss (emerald/red) |
| Win Rate | Percentage of winning trades |
| Profit Factor | Gross profit / gross loss |
| Avg P/L | Average per trade |
| Total Trades | Completed count + active indicator |
| Sharpe Ratio | Risk-adjusted return |
| Streak | Current journal streak with fire emoji, best streak |

### Activity Calendar (GitHub-style)

| Feature | Description |
|---------|-------------|
| Yearly heatmap | 52×7 grid showing trading activity for the year |
| Scoring (0-5) | +1 traded, +1 pre-session, +1 post-session, +1 all journaled, +1 rule adherence ≥70% |
| Color scale | Zinc (no activity) → Emerald shades (more complete) |
| Hover tooltips | Date, trade count, P/L, pre/post session status, journal %, rules %, score |
| Info tooltip | Explains how scoring works |
| Year navigation | Previous/next year arrows |
| Stats | Active days count + perfect days count |

### Other Sections

| Feature | Description |
|---------|-------------|
| Recent Cycles | Last 8 completed trades with journal status, click to journal |
| Strategy Summary | Best performing strategy, most used, rule compliance bar |
| Mistakes Summary | Rolling discipline score (last 20), top mistake, emotion tags |
| Quick Stats Bar | Avg win/loss, avg hold, best hour, best/worst trade, top token, win/loss streak, journal streak, hesitation cost |
| Time Range Filter | 1D/7D/30D/90D/All presets + custom date range picker (top right) |
| Sync Button | Header icon to refresh all active wallets; shows relative "last synced X ago" time |
| Loading indicator | Spinner with "Loading trades..." animated text on overview, trade-journal, and history pages |

**Data sources:** `useWallet()` hook (all active wallets), `useMetadata()` (pre/post session status, strategies, trade comments, missed trades), `/api/pre-sessions` and `/api/post-sessions` (yearly data for activity calendar).

---

## 2. Pre-Session Checklist

**Route:** `/diary/pre-session`

| Feature | Description |
|---------|-------------|
| Completion badge | Green indicator when today's checklist is saved (also shown in sidebar) |
| Market snapshot | Date/time display with placeholder slots for BTC, ETH, SOL, BNB prices, Fear & Greed, 24h volume |
| Energy meter | 1–10 slider with color feedback: green (8–10), yellow (5–7), orange (3–4), red (1–2 — warns against trading) |
| Mindset & state | Single-select emotion buttons (Calm, Anxious, Excited, Frustrated, Revenge-minded, Euphoric) + session intent textarea |
| Session limits | Inputs for max trades, max loss ($), time limit, default position size, open-positions toggle |
| Market context | Sentiment buttons (Bullish/Neutral/Bearish), SOL trend (Up/Sideways/Down), major-news toggle with note, normal-volume toggle |
| Rules reminder | Checkbox list of global rules from Strategies page; links to Strategies if none exist |
| Timezone-aware | Uses user's configured timezone + trading start time to determine "today" |

**Storage:** `PreSession` model in database via `/api/pre-sessions`.

---

## 3. Post-Session Review

**Route:** `/diary/post-session`

| Feature | Description |
|---------|-------------|
| Overall rating | 1-10 scale with visual buttons |
| Emotional state | Dropdown: Calm, Satisfied, Anxious, Frustrated, Euphoric, Exhausted, Neutral |
| What went well | Textarea for best decisions |
| What went wrong | Textarea for mistakes/improvements |
| Key lessons | Textarea for learnings |
| Rules followed | Yes/No toggle with notes textarea |
| Plan for tomorrow | Textarea for next session planning |
| Auto-load | Loads existing entry for today if available |
| Timezone-aware | Uses user's configured timezone + trading start time to determine "today" |

**Storage:** `PostSession` model in database via `/api/post-sessions`.

---

## 4. Notes

**Route:** `/diary/notes`

| Feature | Description |
|---------|-------------|
| Note list | Searchable list with tag filtering |
| Rich editor | Title, content textarea, tags |
| Tags | JSON array of string tags per note |
| CRUD | Full create/read/update/delete via API |

**Storage:** `Note` model in database via `/api/notes`.

---

## 5. Trade Journal

**Route:** `/trade-journal`

### Main table

| Feature | Description |
|---------|-------------|
| Stats row | Total, completed, active, win rate, P/L, journaled count, journaling streak |
| Filters | Status (All/Completed/Active), Journal (All/Journaled/Not), Sort (Recent/P&L↑/P&L↓/Duration), View (Merged/By Wallet) |
| Trade cycles table | Columns: Token (logo + chain badge), PnL ($ + %), Balance, Duration, Strategy (icon + name), Follow Rate (% + fraction), Bought ($+avg), Sold ($+avg), Buys/Sells count, Discipline score bar, Actions |
| Discipline tooltip | Hover to see entry/exit/management comment ratings |
| Transaction modal | Click buys/sells count → modal listing individual transactions with time, type, amounts, prices, DEX |

### JournalModal (per-trade review)

| Section | Details |
|---------|---------|
| Header | Token logo, name, start/end time, duration, buy/sell market cap, P/L |
| Strategy selector | Dropdown populated from Strategies page |
| Rule checklist | Dynamic grouped checkboxes from selected strategy; filters rules by `showWhen` (always/winner/loser/breakeven); shows follow rate % (total + required-only) |
| Emotional state | Dropdown (Confident, Anxious, FOMO, Revenge, Neutral) + 11 emoji emotion-tag buttons (multi-select) |
| Entry analysis | Entry comment dropdown (positive/neutral/negative tags), buy notes textarea, entry rating 1–10, exit plan textarea |
| Exit analysis | Exit rating 1–10, exit comment dropdown, "followed exit rule?" Yes/No, 13 mistake checkboxes, management comment dropdown, sell notes textarea |
| Advanced fields | Stop loss, take profit, trade high, trade low (optional numeric inputs) |
| Attachment | Drag-drop or click image upload (max 5 MB), preview + remove |
| Save options | Save, Save & Next (auto-advances to next unjournaled trade) |

**Storage:** `JournalEntry` model in database via `/api/journals`.

---

## 6. History

**Route:** `/history`

Underline-style tab navigation.

| Tab | Features |
|-----|----------|
| Sessions | Table (date, time, energy badge, emotion, sentiment, SOL trend, max trades, max loss, intent); click row → detail dialog |
| Journal | Table (token, trade #, strategy, emotion badge, buy rating, exit plan, sell rating, followed exit badge, mistakes); click row → detail dialog |
| Transactions | Raw transaction table (paginated, 50/page) with refresh button for force re-fetch |
| Missed Trades | Missed trade entries from papered plays |
| Attachments | Image gallery of trade screenshots/attachments from journal entries |

---

## 7. Analytics

**Routes:** `/analytics` (overview), `/chart-lab/calendar`, `/chart-lab/equity`, `/chart-lab/distribution`, `/chart-lab/holding-time`

| Section | Type | Description |
|---------|------|-------------|
| Stats row | Text | Completed trades, win rate, avg duration, avg P/L, total P/L |
| Cumulative P/L | Line chart | Equity curve over time |
| Duration distribution | Bar chart | Trade count by hold-time buckets (<1h, 1–6h, 6–24h, 1–3d, 3–7d, 7d+) |
| Trading hours | Bar chart | Trade count by hour (0–23), bars colored green/red by avg profitability |
| **P/L calendar** | Grid | Monthly calendar with color-intensity cells; weekly P/L column; prev/next month nav; click day → detail popup; best/worst day summary |
| **Hourly P/L breakdown** | Bar chart | Total P/L by hour with tooltips (trade count, win rate); best/worst hour insight text |
| **Day of week performance** | Bar chart | Total P/L per weekday (Sun–Sat) |
| **Session performance** | Card grid | Cards for Morning Degen (5–9), Peak Hours (9–14), Afternoon (14–18), Evening (18–22), Late Night (22–2), Early AM (2–5); each shows trades, P/L, win rate, profit factor |
| **Duration analysis table** | Table | Buckets with trades, avg P/L, total P/L, win rate, profit factor |
| **Strategy performance** | Table | Per-strategy: trades, total/avg P/L, win rate, profit factor, avg follow rate, best/worst trade |
| **Rule impact analysis** | Horizontal bar chart | Avg P/L when rule followed vs skipped; sorted by impact magnitude |
| **Checklist completion vs P/L** | Bar chart | Avg P/L by completion % buckets (0–25%, 26–50%, 51–75%, 76–100%) |
| **Missed trade analytics** | Cards + bars | Total missed, missed profit, avg multiplier, would-be WR; reason breakdown bars; hesitation cost comparison (actual vs missed) |
| Insights / patterns | Cards | Auto-detected patterns (discipline premium, emotion costs, best/worst hour, hold sweet spot, revenge trading, strategy comparison) with critical/warning/info severity |
| Comment performance | Horizontal bar chart | Total P/L per trade comment tag with avg, count, WR tooltip |
| Discipline efficiency | Line chart | Cumulative + rolling (20-trade) efficiency % (positive / all non-neutral comments) |
| Discipline vs P/L | Composed chart | Dual-axis overlay — equity curve (left) + discipline score area (right) |
| What-If scenario | Collapsible | Filters: exclude undisciplined, specific comments, emotions, strategies; actual vs what-if comparison cards (trades, P/L, WR, PF, avg P/L); impact summary; equity curve comparison |

**Data sources:** `useWallet()` → `flattenedTrades`, journal data from DB, trade comments from DB, papered plays from API, strategies from DB. All analytics computed in `lib/analytics/` modules.

---

## 8. Missed Trades

**Route:** `/missed-trades`

| Feature | Description |
|---------|-------------|
| Log button | Opens enhanced form |
| Token section | Mint address input + "Fetch" button (auto-populates name, symbol, image from Solana Tracker API) |
| Miss reason | 8 emoji chip buttons: Hesitated, Distracted, No Capital, Risk Limit, Spotted Late, Low Conviction, Sleeping, Other |
| Hypothetical trade | Entry price, position size, exit/current price, peak price inputs; auto-calculates multiplier, peak multiplier, potential P/L |
| Outcome | Radio group: Win / Loss / Breakeven / Pending |
| Strategy fit | Dropdown from Strategies page (optional) |
| Notes | Textarea |
| Filter bar | Reason dropdown, strategy dropdown |
| Summary stats | Count, would-be winners, missed profit total, avg multiplier |
| Table | Columns: Token (logo + name), Reason (emoji + text), Strategy (icon + name), Multiplier, Potential P/L, Outcome (colored), Date, Delete action |

**Storage:** Prisma `PaperedPlay` model via `/api/papered-plays`.

---

## 9. Strategies

**Route:** `/strategies`

| Feature | Description |
|---------|-------------|
| Strategy form | Icon picker (12 emojis via popover), color picker (8 presets via popover), name, description |
| Rule groups | Each group has name + ordered rules; each rule has text, "required" checkbox, "show when" dropdown (Always/Winner/Loser/Breakeven) |
| Templates | 3 one-click templates: Solana Momentum (high-volume meme plays), Sniper Entry (fresh deployments), Swing / Narrative Play (catalyst-driven) |
| Strategy cards | Left-border colored by strategy; icon + name + archived badge; description; group/rule counts; accordion expanding to show rules |
| Archive/restore | Toggle strategy between active and archived |
| Advanced mode | Toggle to show/hide advanced strategy editing features |
| Auto-migration | Detects old flat format (`entryConditions/exitConditions/stopLossConditions`) and auto-converts to rule groups on first load |
| Global rules | Separate CRUD section; these rules appear in the Pre-Session checklist; each rule has text + optional rating |

**Storage:** `Strategy` and `GlobalRule` models in database via `/api/strategies` and `/api/rules`.

---

## 10. Wallet Management

**Route:** `/wallet-management`

| Feature | Description |
|---------|-------------|
| Add wallet form | Address input (auto-detects Solana vs EVM), nickname (optional), chain buttons (SOL/BASE/BNB), app/DEX buttons (Fomo/Axiom/Jupiter/GMGN/Other) |
| Wallet cards | Checkbox (active toggle), chain badge, DEX badge, nickname, loading/error indicators, full address, refresh button, remove button |
| Multi-wallet | Multiple wallets can be active simultaneously; trades aggregated across all active wallets |
| Fee deduction | Fomo app trades have 1% fee auto-deducted from `valueUSD` |
| Trade caching | 5-minute DB cache via `/api/trades`; refresh button bypasses cache |

**Storage:** `journalio_saved_wallets` and `journalio_active_wallets` in localStorage. Trade data cached in Prisma `Trade` model.

---

## 11. Settings

**Route:** `/settings`

| Feature | Description |
|---------|-------------|
| Profile | Display name input, email (read-only); requires auth |
| Timezone | Searchable combobox with all IANA timezones; pre-filled with browser-detected timezone; controls when trading day starts |
| Trading start time | Time input (HH:mm); determines when pre-session/post-session resets for a new day |
| Journal view mode | Merged List / By Wallet buttons (localStorage) |
| Trade comments library | Tabbed by category (Entry/Exit/Management); each comment has label + rating (positive/neutral/negative); full CRUD |
| Reset to default | Confirmation dialog, resets all settings including timezone |
| Save | Syncs to `/api/settings` if authenticated |

**Storage:** `UserSettings` model (DB) for auth users; `journalio_journal_view_mode` in localStorage.

---

## 12. API Endpoints

### Active

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/dashboard?addresses=&chains=&dexes=` | Session | Combined: trades, strategies, journals, comments, streak, pre/post session status, missed trades |
| GET | `/api/trades?address=&chain=&refresh=` | Session | Fetch trades with 5-min DB cache, stale fallback on API failure |
| GET | `/api/analytics/overview?...&startDate=&endDate=` | Session | Cumulative P/L, duration buckets, trading hours |
| GET | `/api/analytics/calendar?...&year=&month=` | Session | Monthly P/L calendar data |
| GET | `/api/analytics/time?...&startDate=&endDate=` | Session | Hourly, day-of-week, session performance |
| GET | `/api/analytics/missed?...` | Session | Missed trade stats + hesitation cost |
| POST | `/api/analytics/discipline?...` | Session | Comment performance, efficiency, what-if analysis |
| POST | `/api/analytics/strategy?...` | Session | Strategy performance, rule impact |
| GET | `/api/papered-plays` | Session | List missed trades |
| POST | `/api/papered-plays` | Session | Create missed trade (requires `coinName`) |
| PATCH | `/api/papered-plays/[id]` | Session | Update missed trade |
| DELETE | `/api/papered-plays/[id]` | Session | Delete missed trade |
| GET/POST | `/api/rules` | Session | List/create global rules |
| PATCH/DELETE | `/api/rules/[id]` | Session | Update/delete global rule |
| GET/POST | `/api/trade-comments` | Session | List (auto-seeds defaults)/create trade comments |
| PATCH/DELETE | `/api/trade-comments/[id]` | Session | Update/delete trade comment |
| GET/POST | `/api/strategies` | Session | List/create strategies |
| GET/PATCH/DELETE | `/api/strategies/[id]` | Session | Get/update/delete strategy |
| GET/POST | `/api/pre-sessions` | Session | List (with `from`/`to` range)/upsert pre-sessions |
| GET/DELETE | `/api/pre-sessions/[date]` | Session | Get/delete pre-session by date |
| GET/POST | `/api/post-sessions` | Session | List (with `from`/`to` range)/upsert post-sessions |
| GET/DELETE | `/api/post-sessions/[date]` | Session | Get/delete post-session by date |
| GET/POST | `/api/journals` | Session | List/upsert journal entries |
| GET/DELETE | `/api/journals/[id]` | Session | Get/delete journal entry |
| GET/POST | `/api/notes` | Session | List/create notes |
| GET/PATCH/DELETE | `/api/notes/[id]` | Session | Get/update/delete note |
| GET/PATCH | `/api/settings` | Session | User preferences (timezone, tradingStartTime, etc.) |
| GET/POST | `/api/wallets` | Session | Wallet CRUD |
| DELETE/PATCH | `/api/wallets/[id]` | Session | Wallet operations |
| GET/POST/DELETE | `/api/trade-edits` | Session | Trade edit overrides |
| POST | `/api/manual-trades` | Session | Create manual trade entries |
| GET | `/api/solana/wallet/[address]/trades` | No | Proxy → Solana Tracker trades |
| GET | `/api/solana/wallet/[address]/balances` | No | Proxy → Solana Tracker balances |
| GET | `/api/solana/token/[mint]` | No | Proxy → Solana Tracker token data |
| POST | `/api/auth/sync-user` | Session | Sync authenticated Supabase user to DB |

### Rate Limiting

| Target | Limit | Key |
|--------|-------|-----|
| `/api/solana/*`, `/api/evm/*` proxy routes | 30 req/min | Per IP |
| `/api/auth/sync-user` | 10 req/min | Per IP |
| `/api/trades`, `/api/dashboard` | 30 req/min | Per user |

### Security Headers

All responses include: X-Frame-Options (DENY), HSTS, X-Content-Type-Options (nosniff), Referrer-Policy, Permissions-Policy, Content-Security-Policy.

### Multi-Tenancy

All `[id]` routes verify ownership and return 404 (not 403) to prevent resource enumeration. All DB queries scoped by `userId`.

---

## 13. Core Libraries

| Module | Key Exports | Purpose |
|--------|-------------|---------|
| `lib/wallet-context.tsx` | `WalletProvider`, `useWallet`, `useMetadata` | Multi-wallet state, barrel re-export of split contexts |
| `lib/trading-day.ts` | `getTradingDay`, `getCalendarDate`, `getTradingDayForDate` | Timezone-aware trading day calculation using user's timezone + start time |
| `lib/tradeCycles.ts` | `TradeInput`, `calculateTradeCycles`, `flattenTradeCycles` | Groups raw txs by token → splits into buy/sell cycles by balance changes; `TradeInput` is the typed trade shape |
| `lib/analytics.ts` → `lib/analytics/` | 20+ functions | Computation for all charts: cumulative P/L, duration, calendar (incl. yearly heatmap), hourly, day-of-week, sessions, missed trades, strategy perf, rule impact, what-if, patterns, efficiency, discipline |
| `lib/strategies.ts` | `loadStrategies`, `createStrategy`, `updateStrategy`, `deleteStrategy` | Async strategy CRUD via API |
| `lib/trade-comments.ts` | `loadTradeComments`, `getCommentsByCategory` | Comment library CRUD via API |
| `lib/pre-sessions.ts` | `loadPreSessions`, `loadPreSession`, `savePreSession` | Async pre-session CRUD via API |
| `lib/post-sessions.ts` | `loadPostSessions`, `loadPostSession`, `savePostSession` | Async post-session CRUD via API |
| `lib/journals.ts` | `loadJournals`, `saveJournal` | Async journal entry CRUD via API |
| `lib/rules.ts` | `loadRules`, `createRule`, `updateRule`, `deleteRule` | Async global rule CRUD via API |
| `lib/formatters.ts` | `formatDuration`, `formatValue`, `formatPrice`, `formatPercentage`, `formatTokenAmount`, `formatMarketCap` | Display formatting |
| `lib/solana-tracker.ts` | `getWalletTrades`, `getWalletTokens`, `getTokenData`, `isValidSolanaAddress` | Solana Tracker API client; browser requests proxy through `/api/solana/*` |
| `lib/contexts/` | `DashboardProviders`, `MetadataContext`, `TradeContext`, `WalletIdentityContext`, `BalanceContext` | Split contexts for identity, trades, metadata (incl. post-session status), balances |
| `lib/chains.ts` | `CHAIN_CONFIG`, `detectChainFromAddress` | Multi-chain support (Solana, Base, BNB) |
| `lib/auth-helper.ts` | `requireAuth`, `getAuthUser`, `ensureUserExists` | Supabase server-side auth (session check, returns userId or 401) |
| `lib/supabase-auth.ts` | `supabaseAuth` | Client-side Supabase auth (signIn, signOut with localStorage cleanup, redirect) |
| `lib/rate-limit.ts` | `rateLimit`, `rateLimitByUser` | In-memory rate limiter (per IP or per user) with auto-cleanup |
| `lib/env.ts` | `validateEnv` | Startup validation of required env vars; imported in `instrumentation.ts` |
| `lib/prisma.ts` | `prisma` | Prisma client singleton |

---

## 14. Data Storage

### localStorage Keys

| Key | Used By | Content |
|-----|---------|---------|
| `journalio_saved_wallets` | Wallet Management | Saved wallet objects |
| `journalio_active_wallets` | Wallet Management, WalletProvider | Currently active wallet list |
| `journalio_journal_view_mode` | Trade Journal, Settings | UI preference (merged/grouped) |
| `journalio_migration_v1_complete` | LocalStorageMigration | Migration flag |

### Database Models (Prisma + PostgreSQL / Supabase)

| Model | Purpose |
|-------|---------|
| `User` | User accounts (NextAuth) |
| `Account` / `Session` / `VerificationToken` | NextAuth internals |
| `Wallet` | Multi-chain wallet storage (address, chain, nickname, dex) |
| `Trade` | Cached transactions with 5-min TTL on `indexedAt`; unique per wallet (`@@unique([walletId, signature])`) |
| `TradeEdit` | Manual overrides for trade data |
| `PaperedPlay` | Missed trades with hypothetical trade details, miss reasons, outcome, strategy link |
| `UserSettings` | Display name, dark mode, timezone, trading start time |
| `Strategy` | Named strategies with rule groups (JSON) |
| `GlobalRule` | Global trading rules shown in pre-session checklist |
| `PreSession` | Daily pre-session checklist data (one per user per day) |
| `PostSession` | Daily post-session review data (one per user per day) |
| `JournalEntry` | Per-trade journal entry with strategy, rules, emotions, notes, ratings, attachments |
| `TradeComment` | Discipline comment library (entry/exit/management categories) |
| `Note` | General notes with title, content, and tags |

---

## Data Flow Summary

```
User adds wallets → localStorage (journalio_saved_wallets)
       ↓
Activates wallet → WalletProvider fetches via /api/trades → cached in DB (5-min TTL)
       ↓
Trade cycles computed client-side (tradeCycles.ts)
       ↓
User does pre-session → DB via /api/pre-sessions (timezone-aware "today")
User journals trades → DB via /api/journals
User does post-session → DB via /api/post-sessions (timezone-aware "today")
User logs missed trades → DB via /api/papered-plays
User manages strategies → DB via /api/strategies
       ↓
Home page: SessionHero shows pre/active/post session state; ActivityCalendar shows yearly heatmap
Analytics page computes everything from: flattenedTrades + journals + comments + strategies + missed trades
```

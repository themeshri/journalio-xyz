# Journalio — Features & Functionality

<!-- This file is auto-timestamped on every commit via .git/hooks/post-commit. -->
<!-- When adding or changing features, update the relevant section below. -->

Last updated: 2026-02-21

---

## Table of Contents

1. [Overview Dashboard](#1-overview-dashboard)
2. [Pre-Session Checklist](#2-pre-session-checklist)
3. [Trade Journal](#3-trade-journal)
4. [History](#4-history)
5. [Analytics](#5-analytics)
6. [Missed Trades](#6-missed-trades)
7. [Strategies](#7-strategies)
8. [Wallet Management](#8-wallet-management)
9. [Settings](#9-settings)
10. [API Endpoints](#10-api-endpoints)
11. [Core Libraries](#11-core-libraries)
12. [Data Storage](#12-data-storage)

---

## 1. Overview Dashboard

**Route:** `/`

| Feature | Description |
|---------|-------------|
| Stats row | Total cycles, win rate, total P/L, active (open) cycles |
| Mini P/L calendar | Last 7 days with color-coded daily P/L bars and trade counts |
| Hesitation cost card | Missed profit from papered plays, would-be win rate, ratio to actual trades |
| Recent trades table | Last 10 raw transactions — time, type (buy/sell), from/to tokens, USD value, DEX |

**Data sources:** `useWallet()` hook (all active wallets), `/api/papered-plays` (hesitation cost).

---

## 2. Pre-Session Checklist

**Route:** `/pre-session`

| Feature | Description |
|---------|-------------|
| Completion badge | Green indicator when today's checklist is saved (also shown in sidebar) |
| Market snapshot | Date/time display with placeholder slots for BTC, ETH, SOL, BNB prices, Fear & Greed, 24h volume |
| Energy meter | 1–10 slider with color feedback: green (8–10), yellow (5–7), orange (3–4), red (1–2 — warns against trading) |
| Mindset & state | Single-select emotion buttons (Calm, Anxious, Excited, Frustrated, Revenge-minded, Euphoric) + session intent textarea |
| Session limits | Inputs for max trades, max loss ($), time limit, default position size, open-positions toggle |
| Market context | Sentiment buttons (Bullish/Neutral/Bearish), SOL trend (Up/Sideways/Down), major-news toggle with note, normal-volume toggle |
| Rules reminder | Checkbox list of global rules from Strategies page; links to Strategies if none exist |

**Storage:** `journalio_pre_session_{YYYY-MM-DD}` and `journalio_pre_sessions` index in localStorage.

---

## 3. Trade Journal

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
| Attachment | Drag-drop or click image upload (max 5 MB), preview + remove |
| Save options | Save, Save & Next (auto-advances to next unjournaled trade) |

**Storage:** `journalio_journal_{wallet}_{mint}_{tradeNum}` in localStorage.

---

## 4. History

**Route:** `/history`

| Tab | Features |
|-----|----------|
| Pre-Sessions | Table (date, time, energy badge, emotion, sentiment, SOL trend, max trades, max loss, intent); click row → detail dialog |
| Journal | Table (token, trade #, strategy, emotion badge, buy rating, exit plan, sell rating, followed exit badge, mistakes); click row → detail dialog |
| Transactions | Raw transaction table (paginated, 50/page) with refresh button for force re-fetch |

---

## 5. Analytics

**Route:** `/analytics`

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

**Data sources:** `useWallet()` → `flattenedTrades`, journal data from localStorage, trade comments from localStorage, papered plays from API, strategies from localStorage. All analytics computed in `lib/analytics.ts`.

---

## 6. Missed Trades

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

## 7. Strategies

**Route:** `/strategies`

| Feature | Description |
|---------|-------------|
| Strategy form | Icon picker (12 emojis via popover), color picker (8 presets via popover), name, description |
| Rule groups | Each group has name + ordered rules; each rule has text, "required" checkbox, "show when" dropdown (Always/Winner/Loser/Breakeven) |
| Templates | 3 one-click templates: Solana Momentum (high-volume meme plays), Sniper Entry (fresh deployments), Swing / Narrative Play (catalyst-driven) |
| Strategy cards | Left-border colored by strategy; icon + name + archived badge; description; group/rule counts; accordion expanding to show rules |
| Archive/restore | Toggle strategy between active and archived |
| Auto-migration | Detects old flat format (`entryConditions/exitConditions/stopLossConditions`) and auto-converts to rule groups on first load |
| Global rules | Separate CRUD section; these rules appear in the Pre-Session checklist; each rule has text + optional rating |

**Storage:** `journalio_strategies` and `journalio_rules` in localStorage. Shared interfaces in `lib/strategies.ts`.

---

## 8. Wallet Management

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

## 9. Settings

**Route:** `/settings`

| Feature | Description |
|---------|-------------|
| Profile | Display name input, email (read-only); requires auth |
| Transaction limit | Dropdown: 25 / 50 / 100 / 200 |
| Show USD values | Toggle |
| Journal view mode | Merged List / By Wallet buttons |
| Trade comments library | Tabbed by category (Entry/Exit/Management); each comment has label + rating (positive/neutral/negative); full CRUD; "Reset to Default" with confirmation |
| Save | Syncs to `/api/settings` if authenticated, otherwise localStorage only |

**Storage:** `UserSettings` model (DB) for auth users; `journalio_trade_comments` and `journalio_journal_view_mode` in localStorage.

---

## 10. API Endpoints

### Active

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/trades?address=&chain=&refresh=` | No | Fetch trades with 5-min DB cache, stale fallback on API failure |
| GET | `/api/papered-plays?missReason=&strategyId=&outcome=&from=&to=` | No | List missed trades with optional filters |
| POST | `/api/papered-plays` | No | Create missed trade (requires `coinName`) |
| PATCH | `/api/papered-plays/[id]` | No | Update any field on a missed trade |
| DELETE | `/api/papered-plays/[id]` | No | Delete a missed trade |
| GET/PATCH | `/api/settings` | Session | User preferences |
| GET/POST | `/api/wallets` | Session | Wallet CRUD |
| DELETE/PATCH | `/api/wallets/[id]` | Session | Wallet operations |
| GET/POST/DELETE | `/api/trade-edits` | Session | Trade edit overrides |
| GET | `/api/solana/wallet/[address]/trades` | No | Proxy → Solana Tracker trades |
| GET | `/api/solana/wallet/[address]/balances` | No | Proxy → Solana Tracker balances |
| GET | `/api/solana/token/[mint]` | No | Proxy → Solana Tracker token data |
| * | `/api/auth/[...nextauth]` | — | NextAuth handlers |

### Legacy (unused)

| Route | Description |
|-------|-------------|
| `/api/zerion/wallets/[address]/transactions` | Zerion proxy |
| `/api/zerion/wallets/[address]/portfolio` | Zerion proxy |
| `/api/evm/wallet/[address]/trades` | EVM chain trades |
| `/api/evm/wallet/[address]/balances` | EVM chain balances |

---

## 11. Core Libraries

| Module | Key Exports | Purpose |
|--------|-------------|---------|
| `lib/wallet-context.tsx` | `WalletProvider`, `useWallet` | Multi-wallet state, parallel trade fetching, trade cycle computation |
| `lib/tradeCycles.ts` | `calculateTradeCycles`, `flattenTradeCycles` | Groups raw txs by token → splits into buy/sell cycles by balance changes |
| `lib/analytics.ts` | 20+ functions | Computation for all charts: cumulative P/L, duration, calendar, hourly, day-of-week, sessions, missed trades, strategy perf, rule impact, what-if, patterns, efficiency, discipline |
| `lib/strategies.ts` | `loadStrategies`, `saveStrategies`, `Strategy`, `RuleGroup`, `StrategyRule` | Strategy CRUD from localStorage with auto-migration from legacy format |
| `lib/trade-comments.ts` | `loadTradeComments`, `saveTradeComments` | Comment library CRUD |
| `lib/discipline.ts` | `computeTradeDiscipline` | Per-trade discipline score from journal comments |
| `lib/streaks.ts` | `computeJournalingStreak` | Consecutive journaling day count |
| `lib/formatters.ts` | `formatDuration`, `formatValue`, `formatPrice`, `formatPercentage`, `formatTokenAmount`, `formatMarketCap` | Display formatting |
| `lib/solana-tracker.ts` | `getWalletTrades`, `getWalletTokens`, `getTokenData`, `isValidSolanaAddress` | Solana Tracker API client; browser requests proxy through `/api/solana/*` |
| `lib/chains.ts` | `CHAIN_CONFIG`, `detectChainFromAddress` | Multi-chain support (Solana, Base, BNB) |
| `lib/auth.ts` | `authOptions` | NextAuth config (credentials provider, JWT) |
| `lib/prisma.ts` | `prisma` | Prisma client singleton |

---

## 12. Data Storage

### localStorage Keys

| Key | Used By | Content |
|-----|---------|---------|
| `journalio_strategies` | Strategies, JournalModal, Trade Journal, Analytics, Missed Trades | Array of Strategy objects (rule groups, color, icon) |
| `journalio_rules` | Strategies, Pre-Session, Sidebar | Array of global rule objects |
| `journalio_pre_session_{YYYY-MM-DD}` | Pre-Session, History | Full pre-session checklist data for a date |
| `journalio_pre_sessions` | Pre-Session, History, Sidebar | Index of pre-session summaries |
| `journalio_journal_{wallet}_{mint}_{tradeNum}` | Trade Journal, History, Analytics | Journal entry per trade cycle |
| `journalio_saved_wallets` | Wallet Management | Saved wallet objects |
| `journalio_active_wallets` | Wallet Management, WalletProvider | Currently active wallet list |
| `journalio_trade_comments` | Settings, JournalModal, Analytics | Discipline comment library |
| `journalio_journal_view_mode` | Trade Journal, Settings | UI preference (merged/grouped) |

### Database Models (Prisma + SQLite)

| Model | Purpose |
|-------|---------|
| `User` | User accounts (NextAuth) |
| `Account` / `Session` / `VerificationToken` | NextAuth internals |
| `Wallet` | Multi-chain wallet storage (address, chain, nickname) |
| `Trade` | Cached transactions with 5-min TTL on `indexedAt` |
| `TradeEdit` | Manual overrides for trade data |
| `PaperedPlay` | Missed trades with hypothetical trade details, miss reasons, outcome, strategy link |
| `UserSettings` | Display name, tx limit, USD toggle, dark mode |

---

## Data Flow Summary

```
User adds wallets → localStorage (journalio_saved_wallets)
       ↓
Activates wallet → WalletProvider fetches via /api/trades → cached in DB (5-min TTL)
       ↓
Trade cycles computed client-side (tradeCycles.ts)
       ↓
User journals trades → localStorage per cycle
User does pre-session → localStorage per day
User logs missed trades → DB via /api/papered-plays
User manages strategies → localStorage
       ↓
Analytics page computes everything from: flattenedTrades + journals + comments + strategies + missed trades
```

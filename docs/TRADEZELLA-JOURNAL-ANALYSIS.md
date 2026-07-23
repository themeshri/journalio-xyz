# TradeZella — Journal Tab: Feature & Architecture Analysis

Observed 2026-07-22 from a fresh account (`app.tradezella.com`). Behavioural
observation only — no source, bundles, or assets were extracted. Data model is
*inferred* from filter dimensions, form fields, and rendered metrics.

Purpose: identify which features are worth reimplementing in `journalio-xyz`, and
what each would take in Next.js + Prisma.

---

## 0. Technical stack (observed externally)

All from public HTTP headers, DNS, and the served HTML `<head>`. No bundles were
downloaded or decompiled.

### Frontend
| Signal | Evidence | Conclusion |
|---|---|---|
| `<script type="module" crossorigin src="/static/js/index.BkqLCAzy.js">` | served HTML | **Vite** build (hashed ESM entry, `crossorigin` on module preload). *Not* Next.js — no `__NEXT_DATA__`, no `/_next/`. |
| `<!doctype html><html><head>` with empty body shell | `curl` returns 40KB of `<head>` scripts, zero rendered content | **Pure client-side SPA.** No SSR/SSG. All routing and rendering client-side. |
| `/trading_platform/charting_library.standalone.js` | 60KB, self-hosted | **TradingView Charting Library** (licensed, self-hosted). This is what powers Trade Replay and the price charts. |

### Hosting / infrastructure
| Layer | Evidence | Conclusion |
|---|---|---|
| CDN / WAF | `server: cloudflare`, `cf-ray`, `cf-cache-status` | **Cloudflare** in front of everything |
| SPA origin | `via: 2.0 heroku-router`, `report-to: heroku-nel` | **Heroku** serves the frontend |
| API origin | `x-do-app-origin: 1d55fca0-…`, `x-do-orig-status` | **DigitalOcean App Platform** serves API traffic |
| Internal name | `traderlab-dev.herokuapp.com` referenced in HTML | Internal project name is **"traderlab"**; a dev Heroku app is referenced from prod markup (minor leak on their side) |

Split-cloud: Heroku for the web tier, DigitalOcean for API. Suggests the API was
migrated (or built separately) rather than a single-platform deploy.

### Observability & growth stack
Segment (`cdn.segment.com`) as the CDP hub · GA4 (`G-SFNR10XK17`) · New Relic
(`bam.nr-data.net`) APM · Customer.io (lifecycle email) · Pendo + UserGuiding
(in-app onboarding/tours) · Intercom (support widget) · AbleCDP · Twitter ads pixel
· first-party beacon at `b.tradezella.com`.

Seven analytics/onboarding vendors on the critical path. Notable that two separate
product-tour tools (Pendo *and* UserGuiding) ship simultaneously — likely a
migration in progress.

### What this implies for cloning
- A Vite SPA + separate API is a **conventional, replicable architecture**. Nothing
  exotic. Your Next.js App Router setup is arguably a stronger starting point
  (SSR for the marketing/auth surface, RSC for data-heavy dashboards).
- The **real cost centres are not the framework**: the TradingView license, the
  broker-integration matrix (dozens of brokers/prop firms), and the 45 authored
  strategy templates.
- Their SPA-only choice means **poor SEO on app routes** and a slower first paint —
  a place where a Next.js competitor can straightforwardly do better.

### Not attempted (deliberate)
Bundle decompilation, source-map recovery, CSS/design-token extraction, and
authenticated API schema enumeration were **not** performed. Those reproduce
copyrighted implementation rather than observe architecture, and shipping a clone
derived from them would carry legal exposure. Everything above is externally
observable metadata; everything in §2 is inferred from UI behaviour.

---

## 1. Information architecture

Journal lives at `/tracking` (not `/journal` — that 404s). Nine sections:

| # | Section | Route | Purpose |
|---|---------|-------|---------|
| 1 | Dashboard | `/tracking` | KPI overview, calendar, charts |
| 2 | Day View | `/tracking/day-view` | Per-day / per-week trade breakdown |
| 3 | Trade View | `/tracking/trade-view` | Flat trade list w/ aggregate stats |
| 4 | Notebook | `/tracking/notebook/:folderId/:noteId` | Rich-text notes, foldered |
| 5 | Reports | `/tracking/reports/:reportType` | 7 analytics report categories |
| 6 | Strategies | `/tracking/strategy/my-strategy` | Playbooks + rule definitions |
| 7 | Trade Replay | `/tracking/replay-scenarios` | Bar-by-bar trade replay |
| 8 | Progress Tracker | `/tracking/progress-tracker` | Rule adherence + streak heatmap |
| 9 | Resources | `/tracking/resources` | Economic calendar |

**Two-level nav**: thin icon rail (product switcher: Home / Journal / Backtesting /
Agents / Mentor Mode / PropFirm Sync) + a section sidebar for the active product.
Journalio currently has one flat sidebar — this split is what allows TradeZella to
add whole products without crowding the nav.

**Persistent toolbar** on every section: `Currency ($)` · `Filters` · `Date range` ·
`Account selector`. Filter state is URL-encoded (`?accounts[]=fdad036b&progress=all`),
so views are shareable and back/forward works. Journalio's `GlobalFilterBar` is the
equivalent; the account dimension is the missing piece.

---

## 2. Inferred data model

From the filter panel (the most reliable schema signal — you can only filter on
what you store):

### Trade
```
instrument            enum: stock | option | future | forex | crypto
intradayMultiday      enum
openClosed            enum: open | closed
reviewed              bool          // review workflow state
side                  enum: long | short
symbol                string
status                enum
tradeRating            int          // subjective 1-5 self-grade
entryPrice, exitPrice  decimal
rMultiple              decimal      // R-multiple is FIRST-CLASS, not derived
positionSize, volume   decimal
entryTime, exitTime    datetime
durationMinutes        int          // stored, not computed on read
dayOfWeek, month       int          // denormalised for fast grouping
```

### Tags — two distinct namespaces
```
Mistakes    // e.g. "chased entry", "moved stop"  → drives improvement loop
Custom      // freeform user taxonomy
```
Splitting *mistakes* from *general tags* is the single highest-leverage modelling
decision in the app. It makes "what is costing me money" a first-class query
rather than a text search. Journalio's `TradeComment` is closest but untyped.

### Strategy (Playbook)
```
name, description, icon/color, photo
ruleGroups[]  →  rules[]        // grouped, drag-orderable, conditional
```
Rules are *grouped* with a match mode ("Always" / match-all), i.e. a small boolean
rule engine, not a flat checklist.

### Rule (Progress Tracker) — distinct from strategy rules
```
label            "Start my day by", "Net max loss /day"
condition        "09:30", "100%", "$100"
type             time | percentage | currency | count
streak           int
average          computed
followRate       percentage
```

### Note
```
folderId, title, body(richtext), favorite, tags[],
linkedTradeId?, createdAt, updatedAt
```
Folders observed: All notes / Favorites / **Trade Notes** / **Daily Journal** /
**Sessions Recap** / My notes / Tags / Trash. Trade Notes auto-generate per trade
and embed a stat header (Net P&L, contracts, volume, commissions, Net ROI, Gross P&L)
plus a "View trade details" backlink.

---

## 3. Section-by-section

### 3.1 Dashboard
Widgets, in order:
1. **KPI row** — Net P&L (w/ trade count badge), Trade win %, Profit factor
2. **Second row** — Day win %, Avg win/loss trade (diverging green/red bar)
3. **Zella score** — composite 0–100 gauge ("Available once there is at least 1 trade")
4. **Progress tracker** — GitHub-style heatmap + "Today's score 1/5" + daily checklist
5. **Daily net cumulative P&L** — equity curve
6. **Net daily P&L** — per-day bars
7. **Recent trades / Open positions** — tabbed
8. **Monthly calendar** — per-day P&L cells + **per-week summary column** (`$0 / 0 days`)
9. **Account balance**, **Drawdown**
10. **Trade time performance**, **Trade duration performance**

Notable: every empty state names the missing thing ("Please add initial balance.
Go to manage accounts") rather than showing a generic blank.

> Journalio parity: KPI row, calendar, and activity heatmap already exist. Missing:
> drawdown, account balance curve, time/duration performance, week-summary column.

### 3.2 Day View
Day/Week toggle · date-picker sidebar · per-day rows with Net P&L, expandable trade
list, "View note" button, and a settings gear (column config). "View my day" CTA
recurs across sections — a consistent entry into the daily review ritual.

### 3.3 Trade View
Flat trade table with aggregate header: Net cumulative P&L, Profit factor, Trade
win %, Avg win/loss. Same filter toolbar.

### 3.4 Notebook
Full rich-text editor: templates, **"Write with AI"**, font control, and `/` slash
commands. Sidebar counts per folder. Notes carry a trade-stat header when linked.
This is a genuine second product surface inside the journal — closer to Notion than
to a notes field.

### 3.5 Reports
Tabs: **Performance** (NEW) · Overview · **Reports ▾** · Compare · Calendar ·
Recaps & Insights.

`Reports ▾` submenu — the analytic dimensions:
```
Day & Time · Symbols · Risk · Strategies · Tags ·
Options: Days till expiration · Wins vs Losses
```
**Compare** (A/B two filtered cohorts) and **Recaps & Insights** (auto-generated
narrative) are the two Journalio lacks entirely.

### 3.6 Strategies
- Quota: **My Strategies (0/10)** — plan-gated
- Tabs: My Strategies / **Shared with me** / **Templates** / Backtest Scenarios
- Active / Archived states
- **~45 templates authored by named traders** (Lance Breitstein, Steven Dux, Alex
  Temiz, Pradeep Bonde…), tagged by asset class (Futures/Crypto/Forex/Stocks/Options)
  and style (Intraday/Swing/Scalping). "Add to my strategies" + "Preview".

Builder: Name (+icon/color), Description, Photo, then **Rules** — "Define when a
trade should match this setup", `Add rule group`, drag handles, `Always` match mode,
`Add rule`. Primary CTA is **"Save and backtest"** — strategy creation flows straight
into validation.

> This template marketplace is a **content moat, not a code feature**. Cloning the
> UI is easy; sourcing 45 credible authored playbooks is the actual work.

### 3.7 Trade Replay
"Relive your actual executed trades second-by-second by analyzing your real-time
execution, emotions, and decisions." Requires intraday OHLC bar data + tick-level
fills — the most infrastructure-heavy feature in the app.

### 3.8 Progress Tracker ← highest-value clone target
Layout: Current streak (`1 day 🙂`) · Current period score (gauge `1%`) · Today's
progress (`1/5` + bar) · Daily checklist (per-rule progress `09:26 / 09:30`,
`$0 / $100`) · Heatmap w/ Today button · **Current rules table**:

```
RULE                        CONDITION  STREAK  AVERAGE  FOLLOW RATE
Start my day by 09:30       09:30      1       09:26    4%
Link trades to playbook     100%       0       0%       0%
Input Stop loss to all      100%       0       0%       0%
Net max loss /trade         $100       0       $0       0%
Net max loss /day           $100       0       $0       0%
```

The five defaults encode a whole methodology: **start on time, link every trade to a
playbook, always set a stop, cap per-trade loss, cap daily loss.** Rules are typed
(time / percentage / currency), each tracked with streak + follow-rate. This is a
*behaviour-change engine*, and it's the closest thing to Journalio's existing
`GlobalRule` + `ActivityCalendar` — but far more developed.

### 3.9 Resources
Economic calendar. Thin.

---

## 4. What to build in journalio-xyz

Ranked by (value to your users) ÷ (effort in your stack):

### Tier 1 — build these
1. **Typed rules + follow-rate engine.** Extend `GlobalRule` with
   `type(time|percent|currency|count)`, `condition`, and a derived
   `RuleAdherence` per trading day. Gives streaks, follow rate, and a real
   daily-checklist score. Your `ActivityCalendar` already has 0–5 scoring —
   this makes each point *explainable* instead of binary.
2. **Mistake tags as a distinct namespace.** Add `TradeTag` with
   `kind: mistake | custom`. Unlocks "top 3 mistakes by $ cost" — the single most
   compelling insight a journal can show.
3. **R-multiple as a stored field** on `Trade`, plus `tradeRating` (1–5) and
   `reviewed` bool. Cheap columns; they unlock a whole reports tier.
4. **Week-summary column** on the monthly calendar. Small, high perceived value.

### Tier 2 — worth it
5. **Compare view.** Two filter cohorts side by side. Your `/api/analytics/*`
   already accepts date ranges; generalise to accept two filter sets.
6. **Drawdown + account balance curve.** Needs `initialBalance` on `Wallet`.
7. **Trade-linked notes** with an auto stat header, reusing `JournalEntry`.
8. **Account dimension in the filter bar** (`All accounts` selector), URL-encoded
   like theirs so views stay shareable.

### Tier 3 — only with a reason
9. **Strategy templates.** Clone the *mechanism* (template → "add to my
   strategies"), seed with your own playbooks. Don't copy their 45.
10. **AI session recaps.** Maps to their Agents product; use Claude with your
    existing trade context.
11. **Trade Replay.** Needs intraday bar data — real infra cost. Defer.

### Skip
- Economic calendar (commodity, embed a third-party widget if ever needed)
- Backtesting / Mentor Mode / PropFirm Sync — separate products, not Journal

---

## 5. UX patterns worth adopting

- **Filter state in the URL** — shareable, back-button-correct analytics views.
- **Named empty states** — every blank panel says exactly what to do next.
- **Score-first framing** — a single number (`1/5`, `1%`, streak) at the top of
  each screen. Converts raw data into a target to beat.
- **Recurring "View my day" CTA** — one ritual entry point repeated everywhere,
  rather than expecting users to assemble the habit themselves.
- **Creation flows into validation** — "Save and backtest", not just "Save".
- **Quota surfaced inline** — `My Strategies (0/10)` sets plan expectations early.

## 6. Legal note

Feature concepts, workflows, and data-model *ideas* aren't protectable and are
fine to reimplement. Do **not** copy their CSS/JS, replicate their visual design
pixel-for-pixel, reuse their copy, or reproduce the 45 authored strategy templates
(those carry the authors' rights, not just TradeZella's). Build your own visual
language over these patterns.

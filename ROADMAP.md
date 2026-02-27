# Journalio v2 — Redesign Roadmap

> Inspired by Edgewonk. Tracking all phases and subtasks.
> Mark tasks with `[x]` when complete.

---

## Phase 1: Sidebar Redesign — Icons, Collapse, Sub-tabs `[DONE]`

- [x] Add shadcn Collapsible component (`components/ui/collapsible.tsx`)
- [x] Add Lucide line icons to all nav items (Home, BookOpen, BookHeart, Clock, FlaskConical, BarChart3, Puzzle, Wallet, Settings)
- [x] Enable `collapsible="icon"` mode — collapse to icon-only with `Cmd+B`
- [x] Tooltips on hover in collapsed mode
- [x] Sub-tab system for Diary (Pre-Session, Post-Session, Notes)
- [x] Sub-tab system for History (Pre-Sessions, Journal, Transactions, Missed Trades, Chartbook)
- [x] Sub-tab system for Chart Lab (Calendar)
- [x] Clicking parent in collapsed mode auto-expands sidebar
- [x] Move pre-session route to `/diary/pre-session` with redirect from old path
- [x] Create placeholder pages: post-session, notes, chart-lab/calendar
- [x] Simplify dashboard header (remove redundant Journalio text)
- [x] Update `/pre-session` links to `/diary/pre-session` (ActionBanner)
- [x] Pre-session status dot on Diary parent item
- [x] Discipline dot on Journal item
- [x] Build passes

**Commit:** `bc0e4b0`

---

## Phase 2: Home Page Redesign `[DONE]`

- [x] Rename Overview label to "Home" (page title + sidebar)
- [x] Redesign KPI strip: Net P/L, Win Rate, Profit Factor, Avg P/L, Total Trades, Sharpe Ratio, Streak (7 cards)
- [x] Remove Best/Worst Trade card (info already in QuickStatsBar)
- [x] Add Sharpe Ratio computation (mean/stdDev of returns)
- [x] Add Avg P/L card
- [x] Add Streak card with fire emoji + best streak
- [x] Move Equity Curve up to Row 3 (right after KPIs, more prominent)
- [x] Keep Action Banner, P/L Calendar, Recent Trades, Strategy/Mistakes summaries, QuickStatsBar
- [x] Build passes

**Commit:** `pending`
**Files:** `app/(dashboard)/page.tsx`, `components/overview/KPICards.tsx`

---

## Phase 3: Trade Journal Simplification + Enhanced Popup `[DONE]`

- [x] Remove stats row (Total, Completed, Active, Win Rate, P/L, Journaled)
- [x] Remove filter bar (Status, Journal, Sort, View dropdowns)
- [x] Keep trade cycles table — simplified, clicking row opens popup
- [x] Default sort by recent (no user-facing sort controls)
- [x] Add "Add Manual Trade" button top-right
- [x] Enhanced popup: 2 tabs — Journal | Edit Trade
  - [x] Tab 1 (Journal): existing JournalModal content
  - [x] Tab 2 (Edit Trade): show all transactions, editable buy/sell values per tx
  - [x] "Edit Whole Trade" section: override total bought/sold
  - [x] Save edits to TradeEdit model (override approach)
- [x] Multi-image upload: after image uploaded, show "Upload another" below preview
  - [x] Store as JSON array of base64 strings in `attachment` field
  - [x] Thumbnail grid with individual remove buttons
- [x] Manual Trade Entry dialog
  - [x] Fields: Token (name/mint), Buy Price, Buy Amount, Sell Price, Sell Amount, Date, Notes
  - [x] Creates trade in DB with `source: 'manual'` flag
- [x] Build passes

**Files:** `app/(dashboard)/trade-journal/page.tsx`, `components/JournalModal.tsx`, new `components/EditTradeTab.tsx`, new `components/ManualTradeDialog.tsx`, `/api/trade-edits/`

---

## Phase 4: Diary — Post-Session + Notes [DONE]

- [x] Pre-Session: already moved to `/diary/pre-session` (Phase 1)
- [x] Post-Session page (`/diary/post-session`)
  - [x] Prisma model: `PostSession` (userId, date, rating 1-10, emotionalState, whatWentWell, whatWentWrong, keyLessons, rulesFollowed bool + notes, planForTomorrow)
  - [x] API: `/api/post-sessions` (CRUD, same pattern as pre-sessions)
  - [x] Lib wrapper: `lib/post-sessions.ts`
  - [x] Component: inline in post-session/page.tsx
  - [x] Fields: Date (auto-today), Rating (1-10), Emotional State, What Went Well, What Went Wrong, Key Lessons, Rules Followed?, Plan for Tomorrow
- [x] Notes page (`/diary/notes`)
  - [x] Prisma model: `Note` (userId, title, content, tags JSON, createdAt, updatedAt)
  - [x] API: `/api/notes` (CRUD)
  - [x] Lib wrapper: `lib/notes.ts`
  - [x] Component: inline in notes/page.tsx
  - [x] List view with search/filter by tag
- [x] Prisma migration for PostSession + Note models
- [x] Build passes

**Files:** `app/(dashboard)/diary/post-session/page.tsx`, `app/(dashboard)/diary/notes/page.tsx`, new `components/PostSessionForm.tsx`, new `components/NoteEditor.tsx`, `lib/post-sessions.ts`, `lib/notes.ts`, `prisma/schema.prisma`

---

## Phase 5: Global Filter Bar + Dark Mode + Account Dropdown [DONE]

- [x] Global Filter Bar (top of dashboard, above page content)
  - [x] Basic Filters: Search token, Outcome (Win/Loss/BE), Month, Day
  - [x] Advanced Filters: P/L Range (min/max), Last N Trades
  - [x] Search by token name input
  - [x] Filters stored in URL params (conditionally shown on trade-related pages)
  - [x] Clear all button when filters active
- [x] Dark Mode
  - [x] `next-themes` already installed
  - [x] `ThemeProvider` added to Providers (attribute="class", defaultTheme="dark")
  - [x] Sun/Moon toggle in dashboard header
  - [x] CSS variables already defined in `globals.css`
  - [x] `suppressHydrationWarning` on html tag
- [x] Account Dropdown (top-right)
  - [x] User icon button
  - [x] Dropdown: session user info, Settings link, Milestones (disabled/future), Sign Out
  - [x] Uses NextAuth session
- [x] Build passes

**Files:** `app/(dashboard)/layout.tsx`, `app/layout.tsx`, new `components/GlobalFilterBar.tsx`, new `components/ThemeToggle.tsx`, new `components/AccountDropdown.tsx`, `globals.css`

---

## Phase 6: Chart Lab + Calendar [DONE]

- [x] Calendar page (`/chart-lab/calendar`)
  - [x] Reuses existing PLCalendar component with full day-detail dialog
  - [x] Monthly calendar with daily P/L color-coded cells, click for trade summary
- [x] P/L Distribution page (`/chart-lab/distribution`)
  - [x] Histogram of P/L buckets (green positive, red negative)
  - [x] Stats: Avg Winner, Avg Loser, Win/Loss Ratio, Record
- [x] Equity Curve page (`/chart-lab/equity`)
  - [x] Cumulative P/L area chart with SQN computation
  - [x] Stats: Total P/L, Max Drawdown, SQN rating, Trade count
- [x] Holding Time Analysis page (`/chart-lab/holding-time`)
  - [x] Scatter plot of duration vs P/L
  - [x] Stats: Avg hold time, win rate for short vs long holds
- [x] Chart Lab sub-tab navigation via sidebar
- [x] Build passes
- [ ] Exit Analysis + Trade Management deferred (need SL/TP data from Phase 7)

**Files:** `app/(dashboard)/chart-lab/calendar/page.tsx`, `app/(dashboard)/chart-lab/equity/page.tsx`, `app/(dashboard)/chart-lab/distribution/page.tsx`, `app/(dashboard)/chart-lab/holding-time/page.tsx`

---

## Phase 7: Analytics — Advanced Metrics [DONE]

### Computable NOW (no new data needed):
- [x] Avg Winner / Avg Loser — Mean P/L of winners / losers
- [x] Expectancy — Total P/L / Total trades
- [x] Profit Factor — Sum(wins) / Sum(losses)
- [x] Drawdown — Max peak-to-trough in equity curve
- [x] Return ($) — Sum of all P/L
- [x] Return (%) — Total P/L / starting balance
- [x] Efficiency — % of trades with positive comments
- [x] Sharpe Ratio — Mean(returns) / StdDev(returns)
- [x] Sortino Ratio — Mean(returns) / StdDev(losing returns)
- [x] Calmar Ratio — Total return / Max drawdown
- [x] Gain to Pain — Total return / Sum(abs(losses))

### Needing new optional fields in Journal:
- [x] Add optional fields to JournalModal: Stop Loss, Take Profit, Trade High, Trade Low
- [x] Add fields to JournalEntry Prisma model
- [ ] MAE / MFE — Highest/lowest price during trade
- [ ] R-Multiple — Stop-loss price at entry
- [ ] RRR Planned — Stop-loss + take-profit at entry
- [ ] Capital at Risk — Position size + stop-loss
- [ ] Risk Amount — Entry price - stop-loss
- [ ] Updraw / Drawdown % — Take-profit + stop-loss + high/low
- [ ] Trade Price % — Entry + exit prices (already have)

### Integration:
- [x] Compute "NOW" metrics server-side in `/api/analytics/*` endpoints
- [x] Display as stat cards + charts in Analytics dashboard
- [x] Metrics needing SL/TP show "N/A" when data not available
- [x] Build passes

**Files:** `lib/analytics/`, `app/(dashboard)/analytics/page.tsx`, `components/JournalModal.tsx`, `prisma/schema.prisma`, `/api/analytics/*`

---

## Phase 8: History — Chartbook Sub-tab [DONE]

- [x] Add Chartbook as 5th tab in History page
- [x] Gallery grid of all images from journal entries
- [x] Each image card: thumbnail, token name, trade date, P/L
- [x] Click to open full-size with journal context
- [x] URL-synced tabs (sidebar links work via ?tab= param)
- [x] Reuse existing attachment data from JournalEntry model
- [x] Build passes

**Files:** `app/(dashboard)/history/page.tsx`

---

## Phase 9: Strategies Simplification [DONE]

- [x] Default view: simple mode — just Setup Name + Description + Icon/Color
- [x] "Advanced Mode" toggle at top of strategies page
- [x] Advanced ON: show full rule groups, conditions, showWhen logic (current UI)
- [x] Advanced OFF: hide rule groups section entirely (both cards and form)
- [x] Persist toggle preference in localStorage via `safeLocalStorage`
- [x] Build passes

**Files:** `app/(dashboard)/strategies/page.tsx`

---

## Phase 10: Milestones / Gamification

- [ ] Prisma model: `Milestone` (id, userId, milestoneType, progress, completed, completedAt)
- [ ] Prisma migration
- [ ] API: `/api/milestones` (progress endpoint)
- [ ] Lib wrapper: `lib/milestones.ts`
- [ ] 9 milestone challenges:
  - [ ] First Entry — Journal your first trade
  - [ ] Streak Starter — 3-day journaling streak
  - [ ] Week Warrior — 7-day journaling streak
  - [ ] Month Master — 30-day journaling streak
  - [ ] Rule Follower — 90%+ rule follow rate on 10 consecutive trades
  - [ ] Self-Aware — Complete 10 pre-sessions
  - [ ] Reflector — Complete 10 post-sessions
  - [ ] Analyst — Journal 50 trades with full details
  - [ ] Consistent — Trade within your plan for 20 consecutive trades
- [ ] Server-side progress calculation on journal/pre-session/post-session save
- [ ] Milestone cards in Account dropdown or dedicated page
- [ ] Progress bars, completion badges
- [ ] Toast notifications on milestone completion
- [ ] Build passes

**Files:** new `components/MilestoneCard.tsx`, `lib/milestones.ts`, new `app/api/milestones/`, `prisma/schema.prisma`

---

## Phase 11: Design Polish `[DO LAST]`

- [ ] Remove card border lines, keep shadow only
- [ ] Reduce border-radius globally (`--radius` in `globals.css`)
- [ ] Update `components/ui/card.tsx` — remove border, ensure shadow
- [ ] Audit all card-like components for consistent styling
- [ ] Font combination exploration (future)
- [ ] Consistent spacing and typography
- [ ] Build passes

**Files:** `globals.css`, `components/ui/card.tsx`, various component files

---

## Phase Summary

| # | Phase | Status | Priority | Depends On |
|---|-------|--------|----------|------------|
| 1 | Sidebar Redesign | **DONE** | Must do first | — |
| 2 | Home Page Redesign | **DONE** | High | Phase 1 |
| 3 | Journal Simplification + Popup | **DONE** | High | Phase 1 |
| 4 | Diary (Post-Session + Notes) | DONE | High | Phase 1 |
| 5 | Filter Bar + Dark Mode + Account | DONE | Medium | Phase 1 |
| 6 | Chart Lab + Calendar | DONE | Medium | Phase 1 |
| 7 | Analytics Metrics | **DONE** | Medium | Independent |
| 8 | Chartbook in History | **DONE** | Low | Phase 3 |
| 9 | Strategies Simplification | **DONE** | Low | Independent |
| 10 | Milestones / Gamification | TODO | Low | Phase 4 |
| 11 | Design Polish | TODO | Do last | All phases |

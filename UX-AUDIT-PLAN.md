# UX Audit Implementation Plan

## Phase A — Confirmation Dialogs + Toast Feedback
- [x] #1 Add AlertDialog to strategies page (strategy delete + rule delete)
- [x] #2 Add toast feedback to all save/update/delete operations across pages
- [x] #3 Fix `/api/settings` auth — fall back to `default-user`
- [x] #4 Fix Tailwind v4 `[--var]` → `(--var)` in calendar.tsx + chart.tsx
- [x] #5 Add loading states to pre-session + strategies save buttons

## Phase B — UX + Feedback
- [x] #7 Scope GlobalFilterBar — hide on Settings, Wallet Management, Strategies, Diary, Notes
- [x] #10 Unsaved changes warning in JournalModal (confirm before close with dirty tracking)
- [x] #12 Add `showSign` param to `formatValue()` — +/- prefix on P/L across KPIs, trade journal, recent cycles, quick stats

## Phase C — Form Improvements
- [x] #14 Post-session rating labels ("Poor" / "Excellent" on 1-10 scale)
- [x] #17 Pre-session Max Trades input — add `min="0"` and better placeholder
- [x] #18 Missed trades number inputs — already had `min="0"` ✓
- [x] #19 Notes tag input — already had hint placeholder ✓

## Phase D — Navigation & Layout
- [x] #26 Diary parent route `/diary` — redirect to `/diary/pre-session`
- [x] #29 Diary parent active state — already working via `isParentActive()` ✓

## Phase E — Accessibility
- [x] #40 Icon-only buttons — dialog/sheet close already have `sr-only` labels ✓
- [x] #43 Add `role="progressbar"` + aria attributes to daily checklist progress bar
- [x] #44 Add `role="alert"` to stale data banner
- [x] #49 Wrap fire emoji in sidebar with `aria-hidden="true"`

## Files Modified

| File | Changes |
|------|---------|
| `app/(dashboard)/strategies/page.tsx` | AlertDialog, toast, saving state |
| `app/(dashboard)/wallet-management/page.tsx` | Toast on add/remove, error checking |
| `app/(dashboard)/missed-trades/page.tsx` | Success toast on delete |
| `app/(dashboard)/diary/pre-session/page.tsx` | Saving state, toast, min="0" |
| `app/(dashboard)/diary/post-session/page.tsx` | Rating labels (Poor/Excellent) |
| `app/(dashboard)/diary/page.tsx` | **NEW** — redirect to pre-session |
| `app/(dashboard)/trade-journal/page.tsx` | formatValue with showSign |
| `app/api/settings/route.ts` | Fall back to default-user |
| `components/GlobalFilterBar.tsx` | Pathname-based visibility |
| `components/JournalModal.tsx` | Dirty tracking + unsaved changes warning |
| `components/StaleDataBanner.tsx` | role="alert" |
| `components/app-sidebar.tsx` | aria-hidden on emoji |
| `components/overview/DailyChecklist.tsx` | role="progressbar" |
| `components/overview/KPICards.tsx` | formatValue with showSign |
| `components/overview/QuickStatsBar.tsx` | formatValue with showSign |
| `components/overview/RecentCycles.tsx` | formatValue with showSign |
| `components/ui/calendar.tsx` | Tailwind v4 syntax fix |
| `components/ui/chart.tsx` | Tailwind v4 syntax fix |
| `lib/formatters.ts` | showSign parameter on formatValue |

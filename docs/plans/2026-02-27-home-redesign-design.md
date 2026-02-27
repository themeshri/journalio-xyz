# Home Page Redesign — Phase 2 Design

## Problem

The current Overview page layout buries the Equity Curve at Row 4 and is missing key KPIs (Sharpe Ratio, Avg P/L, Streak). The Best/Worst Trade card duplicates info already in QuickStatsBar.

## Solution

Restructure the existing components (no visual overhaul), add 3 KPIs, move Equity Curve up for prominence.

## Layout

```
Row 0: Title "Home" + TimeRangeFilter                  (keep)
Row 1: ActionBanner                                     (keep)
Row 2: KPI Strip (7 cards)                              (modify)
Row 3: Equity Curve (full width)                        (MOVE UP)
Row 4: [3 cols] Recent Trades | [2 cols] P/L Calendar   (keep)
Row 5: [1 col] Strategy Summary | [1 col] Mistakes      (keep)
Row 6: Quick Stats Bar                                  (keep)
```

## KPI Strip Changes

Replace 5-card strip with 7 cards:

| # | Metric | Formula | Color |
|---|--------|---------|-------|
| 1 | Net P/L | Sum of all P/L | emerald if +, red if - |
| 2 | Win Rate | wins / completed * 100 | none |
| 3 | Profit Factor | grossProfit / grossLoss | emerald ≥1, red <1 |
| 4 | Avg P/L | totalPL / completedCount | emerald if +, red if - |
| 5 | Total Trades | count + "X active" | none |
| 6 | Sharpe Ratio | mean(returns) / stdDev(returns) | emerald ≥1, red <1 |
| 7 | Streak | current streak days | fire emoji |

Grid: 2 cols mobile, 4 cols md, 7 cols lg

## Files to Modify

| File | Change |
|------|--------|
| `components/overview/KPICards.tsx` | Replace Best/Worst with Avg P/L, Sharpe, Streak; 7-card grid |
| `app/(dashboard)/page.tsx` | Move EquityCurve up to Row 3 (swap with current Row 3 position) |

## Reuse

- `KPICards` already computes wins, losses, grossProfit, grossLoss, profitFactor
- Sharpe: `mean / stdDev` on completed trade P/L array — trivial addition
- Avg P/L: `totalPL / completedCount` — trivial
- Streak: already in `useWallet().streak`

import type { FlattenedTrade, CalendarDay, CalendarWeek, CalendarMonth } from './types'

export function computeCalendarData(
  trades: FlattenedTrade[],
  year: number,
  month: number
): CalendarMonth {
  const completed = trades.filter((t) => t.isComplete && t.endDate)

  // Group trades by date string
  const dayMap = new Map<string, CalendarDay>()
  for (const t of completed) {
    const d = new Date((t.endDate || t.startDate) * 1000)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    if (d.getFullYear() !== year || d.getMonth() !== month) continue
    const existing = dayMap.get(key) || { date: key, pnl: 0, tradeCount: 0, wins: 0, losses: 0 }
    existing.pnl += t.profitLoss
    existing.tradeCount += 1
    if (t.profitLoss > 0) existing.wins += 1
    else if (t.profitLoss < 0) existing.losses += 1
    dayMap.set(key, existing)
  }

  // Build weeks
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startDow = firstDay.getDay() // 0=Sun
  const daysInMonth = lastDay.getDate()

  const weeks: CalendarWeek[] = []
  let currentWeek: (CalendarDay | null)[] = new Array(startDow).fill(null)

  for (let day = 1; day <= daysInMonth; day++) {
    const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    currentWeek.push(dayMap.get(key) || { date: key, pnl: 0, tradeCount: 0, wins: 0, losses: 0 })
    if (currentWeek.length === 7) {
      const weeklyPnL = currentWeek.reduce((s, d) => s + (d?.pnl || 0), 0)
      weeks.push({ days: currentWeek, weeklyPnL })
      currentWeek = []
    }
  }
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) currentWeek.push(null)
    const weeklyPnL = currentWeek.reduce((s, d) => s + (d?.pnl || 0), 0)
    weeks.push({ days: currentWeek, weeklyPnL })
  }

  const allDays = [...dayMap.values()]
  const tradingDays = allDays.filter((d) => d.tradeCount > 0)

  return {
    year,
    month,
    weeks,
    totalPnL: Math.round(allDays.reduce((s, d) => s + d.pnl, 0) * 100) / 100,
    totalTrades: allDays.reduce((s, d) => s + d.tradeCount, 0),
    bestDay: tradingDays.length > 0 ? tradingDays.reduce((a, b) => (b.pnl > a.pnl ? b : a)) : null,
    worstDay: tradingDays.length > 0 ? tradingDays.reduce((a, b) => (b.pnl < a.pnl ? b : a)) : null,
  }
}

export function computeYearlyHeatmap(trades: FlattenedTrade[], year: number): CalendarDay[] {
  const completed = trades.filter((t) => t.isComplete && t.endDate)
  const dayMap = new Map<string, CalendarDay>()

  for (const t of completed) {
    const d = new Date((t.endDate || t.startDate) * 1000)
    if (d.getFullYear() !== year) continue
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const existing = dayMap.get(key) || { date: key, pnl: 0, tradeCount: 0, wins: 0, losses: 0 }
    existing.pnl += t.profitLoss
    existing.tradeCount += 1
    if (t.profitLoss > 0) existing.wins += 1
    else if (t.profitLoss < 0) existing.losses += 1
    dayMap.set(key, existing)
  }

  return [...dayMap.values()].sort((a, b) => a.date.localeCompare(b.date))
}

export function getDayColorClass(pnl: number, maxPnl: number, maxLoss: number): string {
  if (pnl === 0) return 'bg-zinc-800'
  if (pnl > 0) {
    const intensity = Math.min(pnl / (maxPnl || 1), 1)
    if (intensity > 0.66) return 'bg-amber-500'
    if (intensity > 0.33) return 'bg-amber-600/70'
    return 'bg-amber-700/50'
  }
  const intensity = Math.min(Math.abs(pnl) / (maxLoss || 1), 1)
  if (intensity > 0.66) return 'bg-red-500'
  if (intensity > 0.33) return 'bg-red-600/70'
  return 'bg-red-700/50'
}

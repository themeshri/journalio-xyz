'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Flame } from 'lucide-react'
import type { StreakResult } from '@/lib/streaks'

interface StreakCardProps {
  streak: StreakResult
  /** Whether the user has journaled today (drives the "keep it alive" nudge). */
  journaledToday: boolean
}

/**
 * Compact journaling-streak card for the home dashboard. Surfaces the current
 * and longest streak (previously only visible deep in Analytics → Sessions)
 * plus a "don't break it today" nudge when today isn't yet covered.
 */
export function StreakCard({ streak, journaledToday }: StreakCardProps) {
  const { current, longest } = streak
  const active = current > 0
  const atRisk = active && !journaledToday

  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4">
        <div
          className={
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-full ' +
            (active ? 'bg-emerald-500/10 text-emerald-500' : 'bg-muted text-muted-foreground')
          }
        >
          <Flame className="h-5 w-5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-2xl font-semibold leading-none">{current}</span>
            <span className="text-xs text-muted-foreground">
              day{current === 1 ? '' : 's'} journaling streak
            </span>
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            {atRisk ? (
              <span className="text-amber-500">Journal a trade today to keep it alive.</span>
            ) : active && journaledToday ? (
              <span className="text-emerald-500">Kept alive today — nice.</span>
            ) : (
              <span>Journal on consecutive days to start a streak.</span>
            )}
          </div>
        </div>

        <div className="shrink-0 text-right">
          <div className="font-mono text-lg font-semibold leading-none">{longest}</div>
          <div className="text-[10px] text-muted-foreground">longest</div>
        </div>
      </CardContent>
    </Card>
  )
}

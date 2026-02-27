'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface ActionBannerProps {
  preSessionDone: boolean
  unjournalledCount: number
  onJournalClick: () => void
}

export function ActionBanner({ preSessionDone, unjournalledCount, onJournalClick }: ActionBannerProps) {
  // State C: Everything done
  if (preSessionDone && unjournalledCount === 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-2">
        <span className="w-2 h-2 rounded-full bg-emerald-500" />
        <span className="text-xs text-emerald-500 font-medium">
          All caught up — pre-session done, all trades journaled
        </span>
      </div>
    )
  }

  // State A: Pre-session not done
  if (!preSessionDone) {
    return (
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="p-4 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-medium text-amber-500">Pre-Session Not Started</p>
            {unjournalledCount > 0 && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {unjournalledCount} trade{unjournalledCount !== 1 ? 's' : ''} not journaled
              </p>
            )}
          </div>
          <Link href="/diary/pre-session">
            <Button size="sm" variant="outline" className="border-amber-500/30 text-amber-500 hover:bg-amber-500/10 shrink-0">
              Start Checklist &rarr;
            </Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  // State B: Pre-session done, un-journaled trades exist
  return (
    <Card>
      <CardContent className="p-4 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium">
            {unjournalledCount} trade{unjournalledCount !== 1 ? 's' : ''} not journaled
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-[10px] text-emerald-500">Pre-session completed</span>
          </div>
        </div>
        <Button size="sm" onClick={onJournalClick} className="shrink-0">
          Journal Now &rarr;
        </Button>
      </CardContent>
    </Card>
  )
}

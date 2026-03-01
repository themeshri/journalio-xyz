'use client'

import Link from 'next/link'
import { CheckCircle2, Circle, ChevronRight } from 'lucide-react'

interface DailyChecklistProps {
  preSessionDone: boolean
  postSessionDone: boolean
  journalProgress: { done: number; total: number }
  onJournalClick: () => void
}

interface ChecklistItemProps {
  label: string
  done: boolean
  detail: string
  href?: string
  onClick?: () => void
}

function ChecklistItem({ label, done, detail, href, onClick }: ChecklistItemProps) {
  const content = (
    <div className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors ${
      href || onClick ? 'hover:bg-muted/50 cursor-pointer' : ''
    }`}>
      {done ? (
        <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500 shrink-0" />
      ) : (
        <Circle className="h-4.5 w-4.5 text-zinc-500 shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <span className={`text-sm ${done ? 'text-muted-foreground line-through' : 'font-medium'}`}>
          {label}
        </span>
        <span className="text-xs text-muted-foreground ml-2">{detail}</span>
      </div>
      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
    </div>
  )

  if (href) {
    return <Link href={href}>{content}</Link>
  }
  if (onClick) {
    return <button className="w-full text-left" onClick={onClick}>{content}</button>
  }
  return content
}

export function DailyChecklist({
  preSessionDone,
  postSessionDone,
  journalProgress,
  onJournalClick,
}: DailyChecklistProps) {
  const journalDone = journalProgress.total === 0 || journalProgress.done >= journalProgress.total
  const completedCount = [preSessionDone, postSessionDone, journalDone].filter(Boolean).length
  const allDone = completedCount === 3
  const progress = completedCount / 3

  return (
    <div className={`rounded-lg border ${allDone ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-border'}`}>
      {/* Progress bar */}
      <div className="px-4 pt-3 pb-1">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-medium">
            {allDone ? 'All caught up' : `Today's checklist`}
          </span>
          <span className={`text-xs font-mono ${allDone ? 'text-emerald-500' : 'text-muted-foreground'}`}>
            {completedCount}/3
          </span>
        </div>
        <div className="h-1 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              allDone ? 'bg-emerald-500' : 'bg-emerald-500/70'
            }`}
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>

      {/* Checklist items */}
      <div className="px-1 pb-1">
        <ChecklistItem
          label="Pre-Session"
          done={preSessionDone}
          detail={preSessionDone ? 'Completed' : 'Not started'}
          href="/diary/pre-session"
        />
        <ChecklistItem
          label="Post-Session"
          done={postSessionDone}
          detail={postSessionDone ? 'Completed' : 'Not started'}
          href="/diary/post-session"
        />
        <ChecklistItem
          label="Journals"
          done={journalDone}
          detail={
            journalProgress.total === 0
              ? 'No recent trades'
              : `${journalProgress.done}/${journalProgress.total} trades`
          }
          href={journalDone ? '/trade-journal' : undefined}
          onClick={!journalDone ? onJournalClick : undefined}
        />
      </div>
    </div>
  )
}

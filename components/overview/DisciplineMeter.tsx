'use client'

import { disciplineColor } from '@/lib/discipline'

interface DisciplineMeterProps {
  /** 0–100 discipline percentage, or null when there's nothing to score yet. */
  percentage: number | null
  /** Small inline variant for embedding in the journal modal. */
  compact?: boolean
  /** Optional label override (default "Discipline"). */
  label?: string
}

const COLOR_BG: Record<'red' | 'yellow' | 'emerald', string> = {
  red: 'bg-red-500',
  yellow: 'bg-yellow-500',
  emerald: 'bg-emerald-500',
}
const COLOR_TEXT: Record<'red' | 'yellow' | 'emerald', string> = {
  red: 'text-red-500',
  yellow: 'text-yellow-500',
  emerald: 'text-emerald-500',
}

/**
 * Green→red discipline meter (Tiltmeter-style). Renders a horizontal bar whose
 * fill and color track the discipline percentage derived from rated entry/exit/
 * management comments. Used both as a live in-modal meter (compact) and as a
 * dashboard widget.
 */
export function DisciplineMeter({ percentage, compact = false, label = 'Discipline' }: DisciplineMeterProps) {
  const empty = percentage === null
  const pct = empty ? 0 : Math.max(0, Math.min(100, percentage))
  const color = empty ? 'yellow' : disciplineColor(pct)

  const prompt = empty
    ? 'Rate your entry/exit to see your discipline.'
    : color === 'emerald'
      ? 'Green — disciplined. Keep it up.'
      : color === 'yellow'
        ? 'Mixed — will this keep your meter green?'
        : 'Red — broke your rules. Reset before the next trade.'

  return (
    <div className={compact ? 'space-y-1' : 'space-y-1.5'}>
      <div className="flex items-center justify-between">
        <span className={`font-medium ${compact ? 'text-xs' : 'text-sm'}`}>{label}</span>
        <span className={`font-mono font-semibold ${compact ? 'text-xs' : 'text-sm'} ${empty ? 'text-muted-foreground' : COLOR_TEXT[color]}`}>
          {empty ? '—' : `${Math.round(pct)}%`}
        </span>
      </div>
      <div className={`w-full rounded-full bg-muted ${compact ? 'h-1.5' : 'h-2'}`}>
        <div
          className={`h-full rounded-full transition-all duration-300 ${COLOR_BG[color]} ${empty ? 'opacity-30' : ''}`}
          style={{ width: `${empty ? 100 : pct}%` }}
        />
      </div>
      <p className={`text-muted-foreground ${compact ? 'text-[10px]' : 'text-[11px]'}`}>{prompt}</p>
    </div>
  )
}

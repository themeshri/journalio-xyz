'use client'

import { ClipboardList, BookOpen, BookHeart, BarChart3, SlidersHorizontal, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface TradingLoopStepProps {
  onNext: () => void
}

const sections = [
  {
    icon: ClipboardList,
    label: 'Pre-Session',
    description: 'Start each day by setting intentions, energy level, and reviewing your rules.',
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
  },
  {
    icon: BookOpen,
    label: 'Journal',
    description: 'Document every trade with strategy, discipline comments, and emotional state.',
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
  },
  {
    icon: BookHeart,
    label: 'Post-Session',
    description: 'End your day with a review — what went well, lessons learned, plan for tomorrow.',
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
  },
  {
    icon: BarChart3,
    label: 'Analytics',
    description: 'Track P/L, discipline, win rate, and discover patterns in your trading behavior.',
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
  },
  {
    icon: SlidersHorizontal,
    label: 'Filters',
    description: 'Filter your dashboard by time range — 1D, 7D, 30D, 90D, or custom dates.',
    color: 'text-rose-500',
    bg: 'bg-rose-500/10',
  },
]

export function TradingLoopStep({ onNext }: TradingLoopStepProps) {
  return (
    <div className="flex flex-col items-center max-w-lg mx-auto w-full">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold mb-1">Your Daily Workflow</h2>
        <p className="text-sm text-muted-foreground">
          Here's how to get the most out of Journalio.
        </p>
      </div>

      <div className="w-full space-y-2 mb-8">
        {sections.map((s, i) => (
          <div key={s.label} className="flex items-start gap-3 p-3 rounded-lg border bg-card/50">
            <div className={`h-8 w-8 rounded-lg ${s.bg} flex items-center justify-center shrink-0 mt-0.5`}>
              <s.icon className={`h-4 w-4 ${s.color}`} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-muted-foreground/60">{i + 1}</span>
                <span className="text-sm font-medium">{s.label}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{s.description}</p>
            </div>
          </div>
        ))}
      </div>

      <Button onClick={onNext}>
        Continue
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  )
}

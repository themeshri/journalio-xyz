'use client'

import { ClipboardList, TrendingUp, BookOpen, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface TradingLoopStepProps {
  onNext: () => void
}

export function TradingLoopStep({ onNext }: TradingLoopStepProps) {
  return (
    <div className="flex flex-col items-center text-center max-w-xl mx-auto">
      <h2 className="text-xl font-semibold mb-2">The Trading Feedback Loop</h2>
      <p className="text-sm text-muted-foreground mb-10">
        This daily loop is what separates disciplined traders from gamblers.
      </p>

      <div className="grid grid-cols-3 gap-4 mb-10 w-full">
        <div className="flex flex-col items-center gap-3 p-5 rounded-xl border bg-card">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <ClipboardList className="h-5 w-5 text-primary" />
          </div>
          <span className="text-sm font-semibold">Pre-Session</span>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Set your intentions, check your energy, and review your rules before trading.
          </p>
        </div>

        <div className="flex flex-col items-center gap-3 p-5 rounded-xl border bg-card">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <TrendingUp className="h-5 w-5 text-primary" />
          </div>
          <span className="text-sm font-semibold">Active Trading</span>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Journal each trade with strategy, discipline comments, and emotional state.
          </p>
        </div>

        <div className="flex flex-col items-center gap-3 p-5 rounded-xl border bg-card">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <BookOpen className="h-5 w-5 text-primary" />
          </div>
          <span className="text-sm font-semibold">Post-Session</span>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Review what went well, what didn't, and set your plan for tomorrow.
          </p>
        </div>
      </div>

      {/* Connecting arrows */}
      <p className="text-xs text-muted-foreground mb-8">
        Repeat daily. Track patterns in Analytics. Improve over time.
      </p>

      <Button onClick={onNext}>
        Continue
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  )
}

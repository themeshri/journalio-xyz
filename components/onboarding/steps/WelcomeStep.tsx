'use client'

import { ClipboardList, TrendingUp, BookOpen, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface WelcomeStepProps {
  onNext: () => void
}

export function WelcomeStep({ onNext }: WelcomeStepProps) {
  return (
    <div className="flex flex-col items-center text-center max-w-lg mx-auto">
      <h1 className="text-3xl font-bold tracking-tight mb-3">
        Welcome to Journalio
      </h1>
      <p className="text-muted-foreground mb-10">
        The trading journal that closes the feedback loop.
      </p>

      {/* Feedback loop visual */}
      <div className="flex items-center gap-3 mb-10">
        <div className="flex flex-col items-center gap-2 p-4 rounded-xl border bg-card w-36">
          <ClipboardList className="h-6 w-6 text-primary" />
          <span className="text-sm font-medium">Pre-Session</span>
          <span className="text-xs text-muted-foreground">Set intentions</span>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
        <div className="flex flex-col items-center gap-2 p-4 rounded-xl border bg-card w-36">
          <TrendingUp className="h-6 w-6 text-primary" />
          <span className="text-sm font-medium">Trade</span>
          <span className="text-xs text-muted-foreground">Journal each trade</span>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
        <div className="flex flex-col items-center gap-2 p-4 rounded-xl border bg-card w-36">
          <BookOpen className="h-6 w-6 text-primary" />
          <span className="text-sm font-medium">Post-Session</span>
          <span className="text-xs text-muted-foreground">Review & learn</span>
        </div>
      </div>

      <Button onClick={onNext} size="lg">
        Get Started
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  )
}

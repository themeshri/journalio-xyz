'use client'

import { CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface CompletionStepProps {
  onFinish: () => void
}

export function CompletionStep({ onFinish }: CompletionStepProps) {
  return (
    <div className="flex flex-col items-center text-center max-w-md mx-auto">
      <div className="relative mb-6">
        <CheckCircle2 className="h-16 w-16 text-primary animate-pulse" />
      </div>
      <h2 className="text-2xl font-bold mb-2">You&apos;re all set</h2>
      <p className="text-muted-foreground mb-8">
        The <span className="font-medium text-foreground">Getting Started</span>{' '}
        checklist on your dashboard tracks anything left to finish — connect a
        wallet, add a strategy, and run your first pre-session to begin the loop.
      </p>
      <Button onClick={onFinish} size="lg">
        Go to Dashboard
      </Button>
    </div>
  )
}

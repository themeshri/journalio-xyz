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
      <h2 className="text-2xl font-bold mb-2">You're Ready</h2>
      <p className="text-muted-foreground mb-8">
        Your journal is set up. Start with a pre-session to begin the feedback loop.
      </p>
      <Button onClick={onFinish} size="lg">
        Go to Dashboard
      </Button>
    </div>
  )
}

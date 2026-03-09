'use client'

import { useState, useCallback } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StepIndicator } from './StepIndicator'
import { WelcomeStep } from './steps/WelcomeStep'
import { AddWalletStep } from './steps/AddWalletStep'
import { TimezoneStep } from './steps/TimezoneStep'
import { TradingLoopStep } from './steps/TradingLoopStep'
import { CompletionStep } from './steps/CompletionStep'

const TOTAL_STEPS = 5

interface OnboardingWizardProps {
  initialStep: number
  onStepChange: (step: number) => void
  onComplete: () => void
  onSkip: () => void
}

export function OnboardingWizard({ initialStep, onStepChange, onComplete, onSkip }: OnboardingWizardProps) {
  const [step, setStep] = useState(initialStep)

  const goTo = useCallback((next: number) => {
    setStep(next)
    onStepChange(next)
  }, [onStepChange])

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <StepIndicator totalSteps={TOTAL_STEPS} currentStep={step} />
        <Button
          variant="ghost"
          size="sm"
          onClick={onSkip}
          className="text-muted-foreground"
        >
          <X className="h-4 w-4 mr-1" />
          Skip
        </Button>
      </div>

      {/* Step content */}
      <div className="flex-1 flex items-center justify-center px-6 overflow-auto">
        {step === 0 && <WelcomeStep onNext={() => goTo(1)} />}
        {step === 1 && <AddWalletStep onNext={() => goTo(2)} />}
        {step === 2 && <TimezoneStep onNext={() => goTo(3)} />}
        {step === 3 && <TradingLoopStep onNext={() => goTo(4)} />}
        {step === 4 && <CompletionStep onFinish={onComplete} />}
      </div>
    </div>
  )
}

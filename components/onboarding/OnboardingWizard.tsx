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
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onSkip} />

      {/* Dialog */}
      <div className="relative z-10 w-full max-w-2xl max-h-[85vh] mx-4 rounded-xl border bg-card shadow-2xl flex flex-col overflow-hidden">
        {/* Progress bar - center top */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3">
          <div className="flex-1" />
          <StepIndicator totalSteps={TOTAL_STEPS} currentStep={step} />
          <div className="flex-1 flex justify-end">
            <Button
              variant="ghost"
              size="icon"
              onClick={onSkip}
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Step content */}
        <div className="flex-1 flex items-center justify-center px-6 pb-8 pt-2 overflow-auto">
          {step === 0 && <WelcomeStep onNext={() => goTo(1)} />}
          {step === 1 && <AddWalletStep onNext={() => goTo(2)} />}
          {step === 2 && <TimezoneStep onNext={() => goTo(3)} />}
          {step === 3 && <TradingLoopStep onNext={() => goTo(4)} />}
          {step === 4 && <CompletionStep onFinish={onComplete} />}
        </div>
      </div>
    </div>
  )
}

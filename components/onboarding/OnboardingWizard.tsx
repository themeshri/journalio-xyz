'use client'

import { useState, useCallback } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StepIndicator } from './StepIndicator'
import { PreferencesStep } from './steps/PreferencesStep'
import { AddWalletStep } from './steps/AddWalletStep'
import { TradingLoopStep } from './steps/TradingLoopStep'
import { CompletionStep } from './steps/CompletionStep'

const TOTAL_STEPS = 4

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
      {/* Backdrop — deliberately NOT click-to-dismiss: an accidental click
          shouldn't silently end setup and drop the user on an empty dashboard.
          Dismissal is only via the explicit "I'll do this later" control. */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

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
              aria-label="Close setup"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Step content */}
        <div className="flex-1 flex items-center justify-center px-6 pb-4 pt-2 overflow-auto">
          {step === 0 && <PreferencesStep onNext={() => goTo(1)} />}
          {step === 1 && <AddWalletStep onNext={() => goTo(2)} />}
          {step === 2 && <TradingLoopStep onNext={() => goTo(3)} />}
          {step === 3 && <CompletionStep onFinish={onComplete} />}
        </div>

        {/* Explicit low-emphasis dismissal — the checklist on Home carries any
            remaining setup, so leaving here isn't a dead end. Hidden on the
            final completion step, which has its own primary CTA. */}
        {step < 3 && (
          <div className="flex justify-center pb-4">
            <Button
              variant="link"
              size="sm"
              onClick={onSkip}
              className="text-xs text-muted-foreground"
            >
              I&apos;ll do this later
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

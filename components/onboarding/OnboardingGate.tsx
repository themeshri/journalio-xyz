'use client'

import { useCallback, useEffect, useRef } from 'react'
import { useMetadata } from '@/lib/contexts/metadata-context'
import { useWalletIdentity } from '@/lib/contexts'
import { OnboardingWizard } from './OnboardingWizard'
import { DashboardTour } from './DashboardTour'

async function patchOnboardingStep(step: number | null) {
  await fetch('/api/settings', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ onboardingStep: step }),
  })
}

export function OnboardingGate() {
  const { onboardingStep, setOnboardingStep } = useMetadata()
  const { savedWallets, initialized } = useWalletIdentity()
  const autoSkipped = useRef(false)

  // Existing user with wallets but null onboardingStep → auto-complete
  useEffect(() => {
    if (!initialized || autoSkipped.current) return
    if (onboardingStep === null && savedWallets.length > 0) {
      autoSkipped.current = true
      setOnboardingStep(6)
      patchOnboardingStep(6)
    }
  }, [initialized, onboardingStep, savedWallets.length, setOnboardingStep])

  const handleStepChange = useCallback(async (step: number) => {
    setOnboardingStep(step)
    await patchOnboardingStep(step)
  }, [setOnboardingStep])

  const handleWizardComplete = useCallback(async () => {
    // Step 5 = wizard done, tour pending
    setOnboardingStep(5)
    await patchOnboardingStep(5)
  }, [setOnboardingStep])

  const handleSkip = useCallback(async () => {
    setOnboardingStep(6)
    await patchOnboardingStep(6)
  }, [setOnboardingStep])

  const handleTourComplete = useCallback(async () => {
    setOnboardingStep(6)
    await patchOnboardingStep(6)
  }, [setOnboardingStep])

  if (!initialized) return null

  // Show wizard for steps 0-4 (or null for new users with no wallets)
  if (onboardingStep === null && savedWallets.length === 0) {
    return (
      <OnboardingWizard
        initialStep={0}
        onStepChange={handleStepChange}
        onComplete={handleWizardComplete}
        onSkip={handleSkip}
      />
    )
  }

  if (onboardingStep !== null && onboardingStep >= 0 && onboardingStep <= 4) {
    return (
      <OnboardingWizard
        initialStep={onboardingStep}
        onStepChange={handleStepChange}
        onComplete={handleWizardComplete}
        onSkip={handleSkip}
      />
    )
  }

  // Show tour for step 5
  if (onboardingStep === 5) {
    return <DashboardTour onComplete={handleTourComplete} onSkip={handleSkip} />
  }

  // Step 6 or anything else: onboarded, render nothing
  return null
}

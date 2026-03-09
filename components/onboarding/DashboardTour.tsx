'use client'

import { useState } from 'react'
import { TourHighlight } from './TourHighlight'

const TOUR_STEPS = [
  {
    target: "[data-tour='sidebar']",
    title: 'Navigate your journal',
    description: 'The sidebar has all sections: journal, diary, analytics, strategies, and more. Everything is organized by your daily trading workflow.',
  },
  {
    target: "[data-tour='session-hero']",
    title: 'Your daily command center',
    description: 'Start each day with a pre-session, track your active session stats, and close with a post-session review.',
  },
  {
    target: "[data-tour='kpi-cards']",
    title: 'Performance at a glance',
    description: 'Track P/L, win rate, profit factor, and other key metrics. These update based on your selected time range.',
  },
  {
    target: "[data-tour='nav-journal']",
    title: 'Journal every trade',
    description: 'Document your reasoning, strategy, and discipline for each trade. This is where the real improvement happens.',
  },
  {
    target: undefined, // centered, no target
    title: "You're all set!",
    description: 'Start your first pre-session to begin the feedback loop. The more you journal, the more patterns you\'ll discover in Analytics.',
  },
]

interface DashboardTourProps {
  onComplete: () => void
  onSkip: () => void
}

export function DashboardTour({ onComplete, onSkip }: DashboardTourProps) {
  const [step, setStep] = useState(0)

  function handleNext() {
    if (step >= TOUR_STEPS.length - 1) {
      onComplete()
    } else {
      setStep(step + 1)
    }
  }

  const current = TOUR_STEPS[step]

  return (
    <TourHighlight
      key={step}
      targetSelector={current.target}
      title={current.title}
      description={current.description}
      stepNumber={step}
      totalSteps={TOUR_STEPS.length}
      onNext={handleNext}
      onSkip={onSkip}
    />
  )
}

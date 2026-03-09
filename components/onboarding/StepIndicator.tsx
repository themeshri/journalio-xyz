'use client'

interface StepIndicatorProps {
  totalSteps: number
  currentStep: number
}

const STEP_LABELS = ['Welcome', 'Wallet', 'Timezone', 'Your Workflow', 'Done']

export function StepIndicator({ totalSteps, currentStep }: StepIndicatorProps) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="flex items-center gap-1.5">
        {Array.from({ length: totalSteps }, (_, i) => (
          <div key={i} className="flex items-center">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                i < currentStep
                  ? 'w-6 bg-primary'
                  : i === currentStep
                    ? 'w-6 bg-primary'
                    : 'w-2 bg-muted-foreground/30'
              }`}
            />
          </div>
        ))}
      </div>
      <span className="text-[10px] text-muted-foreground">
        {currentStep + 1} of {totalSteps} — {STEP_LABELS[currentStep] || ''}
      </span>
    </div>
  )
}

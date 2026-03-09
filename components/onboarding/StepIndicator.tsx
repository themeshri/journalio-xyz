'use client'

interface StepIndicatorProps {
  totalSteps: number
  currentStep: number
}

export function StepIndicator({ totalSteps, currentStep }: StepIndicatorProps) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: totalSteps }, (_, i) => (
        <div
          key={i}
          className={`h-2 w-2 rounded-full transition-all duration-300 ${
            i < currentStep
              ? 'bg-primary'
              : i === currentStep
                ? 'ring-2 ring-primary bg-primary'
                : 'bg-muted-foreground/30'
          }`}
        />
      ))}
    </div>
  )
}

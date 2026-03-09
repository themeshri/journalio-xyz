'use client'

interface RatingScaleProps {
  value: number
  onChange: (value: number) => void
  max?: number
  size?: 'sm' | 'md'
  label?: string
  lowLabel?: string
  highLabel?: string
}

function getRatingColor(value: number, max: number): string {
  const pct = value / max
  if (pct <= 0.3) return 'bg-red-500 text-white'
  if (pct <= 0.5) return 'bg-orange-500 text-white'
  if (pct <= 0.7) return 'bg-yellow-500 text-white'
  return 'bg-emerald-500 text-white'
}

export function RatingScale({
  value,
  onChange,
  max = 10,
  size = 'md',
  label,
  lowLabel,
  highLabel,
}: RatingScaleProps) {
  const numbers = Array.from({ length: max }, (_, i) => i + 1)
  const sizeClass = size === 'sm' ? 'w-7 h-7 text-sm' : 'w-8 h-8 text-sm'

  return (
    <div>
      {label && <label className="text-xs font-medium mb-1.5 block">{label}</label>}
      <div className="flex items-center gap-0.5" role="group" aria-label={label || 'Rating'}>
        {lowLabel && <span className="text-xs text-muted-foreground mr-1">{lowLabel}</span>}
        {numbers.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`${sizeClass} rounded transition-colors ${
              n <= value
                ? getRatingColor(value, max)
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
            aria-label={`Rate ${n} out of ${max}`}
          >
            {n}
          </button>
        ))}
        {highLabel && <span className="text-xs text-muted-foreground ml-1">{highLabel}</span>}
        {value > 0 && (
          <span className="ml-2 text-xs text-muted-foreground self-center font-mono tabular-nums">
            {value}/{max}
          </span>
        )}
      </div>
    </div>
  )
}

'use client'

/**
 * Single-select chip row over a fixed option list.
 *
 * The chip-with-emerald-active pattern was hand-rolled three separate times
 * (pre-session emotional state and market sentiment, post-session emotional
 * state) before this existed. It is also what renders the framework enums,
 * where the per-option `description` matters — a stage like "Memed" means
 * nothing without its gloss.
 */

interface SegmentedEnumOption<T extends string> {
  value: T
  label: string
  description?: string
}

interface SegmentedEnumProps<T extends string> {
  options: readonly SegmentedEnumOption<T>[]
  value: T | ''
  /** Re-selecting the active option clears it, matching YesNoToggle. */
  onChange: (value: T | '') => void
  /** Show the active option's description below the row. */
  showDescription?: boolean
  size?: 'sm' | 'md'
  ariaLabel?: string
}

export function SegmentedEnum<T extends string>({
  options,
  value,
  onChange,
  showDescription = true,
  size = 'md',
  ariaLabel,
}: SegmentedEnumProps<T>) {
  const active = options.find((o) => o.value === value)
  const sizeClass = size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm'

  return (
    <div>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label={ariaLabel}>
        {options.map((option) => {
          const on = option.value === value
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(on ? '' : option.value)}
              className={`${sizeClass} rounded-md border transition-colors ${
                on
                  ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 font-medium'
                  : 'border-border text-muted-foreground hover:bg-muted/50'
              }`}
            >
              {option.label}
            </button>
          )
        })}
      </div>

      {showDescription && active?.description && (
        <p className="text-xs text-muted-foreground mt-2">{active.description}</p>
      )}
    </div>
  )
}

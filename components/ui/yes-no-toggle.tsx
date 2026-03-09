'use client'

interface YesNoToggleProps {
  value: boolean | null
  onChange: (value: boolean | null) => void
  allowDeselect?: boolean
}

export function YesNoToggle({ value, onChange, allowDeselect = true }: YesNoToggleProps) {
  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => onChange(allowDeselect && value === true ? null : true)}
        className={`px-4 py-1.5 text-sm rounded-md border transition-colors ${
          value === true
            ? 'bg-emerald-600 text-white border-emerald-600'
            : 'bg-muted text-muted-foreground border-border hover:bg-muted/80'
        }`}
      >
        Yes
      </button>
      <button
        type="button"
        onClick={() => onChange(allowDeselect && value === false ? null : false)}
        className={`px-4 py-1.5 text-sm rounded-md border transition-colors ${
          value === false
            ? 'bg-red-600 text-white border-red-600'
            : 'bg-muted text-muted-foreground border-border hover:bg-muted/80'
        }`}
      >
        No
      </button>
    </div>
  )
}

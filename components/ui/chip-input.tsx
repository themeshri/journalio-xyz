'use client'

import { useState, useCallback } from 'react'
import { X } from 'lucide-react'
import { Input } from '@/components/ui/input'

/**
 * Free-text chip list — type, press Enter, get a removable chip.
 *
 * Used for the pre-session's sectors and communities, which are open
 * vocabularies that change every cycle. A fixed enum would be wrong here (this
 * month's leading sector did not exist last year), and the TradeTag system is
 * the wrong home too — those are user-curated taxonomy with colours and
 * archival, whereas these are a quick daily jot.
 */

interface ChipInputProps {
  value: string[]
  onChange: (value: string[]) => void
  placeholder?: string
  /** Guards against a runaway list in a form meant to be filled in minutes. */
  max?: number
  id?: string
}

export function ChipInput({
  value,
  onChange,
  placeholder,
  max = 12,
  id,
}: ChipInputProps) {
  const [draft, setDraft] = useState('')

  const commit = useCallback(() => {
    const next = draft.trim()
    if (!next) return
    // Case-insensitive dedupe so "DeFi" and "defi" don't both land.
    const exists = value.some((v) => v.toLowerCase() === next.toLowerCase())
    if (!exists && value.length < max) onChange([...value, next])
    setDraft('')
  }, [draft, value, onChange, max])

  const remove = useCallback(
    (item: string) => onChange(value.filter((v) => v !== item)),
    [value, onChange]
  )

  return (
    <div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {value.map((item) => (
            <span
              key={item}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2 py-1 text-xs"
            >
              {item}
              <button
                type="button"
                onClick={() => remove(item)}
                className="text-muted-foreground hover:text-foreground"
                aria-label={`Remove ${item}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {value.length < max && (
        <Input
          id={id}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              // This input often sits inside a form; Enter should add a chip,
              // not submit the page.
              e.preventDefault()
              commit()
            } else if (e.key === 'Backspace' && !draft && value.length > 0) {
              remove(value[value.length - 1])
            }
          }}
          onBlur={commit}
          placeholder={placeholder}
        />
      )}
    </div>
  )
}

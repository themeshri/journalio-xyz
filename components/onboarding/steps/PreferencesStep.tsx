'use client'

import { useState } from 'react'
import { ArrowRight, ClipboardList, TrendingUp, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { toast } from 'sonner'

interface PreferencesStepProps {
  onNext: () => void
}

/**
 * Welcome + preferences in one step (merged from the old WelcomeStep +
 * TimezoneStep). TradeZella opens with a single "Let's set your preferences"
 * form rather than a separate welcome screen; this mirrors that — a compact
 * feedback-loop intro plus display name, timezone, and trading start time,
 * saved via PATCH /api/settings.
 */
export function PreferencesStep({ onNext }: PreferencesStepProps) {
  const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone
  const [displayName, setDisplayName] = useState('')
  const [timezone, setTimezone] = useState(browserTz)
  const [tradingStartTime, setTradingStartTime] = useState('09:00')
  const [tzOpen, setTzOpen] = useState(false)
  const [tzSearch, setTzSearch] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timezone,
          tradingStartTime,
          ...(displayName.trim() ? { displayName: displayName.trim() } : {}),
        }),
      })
      if (res.ok) {
        onNext()
      } else {
        toast.error('Failed to save preferences')
      }
    } catch {
      toast.error('Failed to save preferences')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto w-full">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold tracking-tight mb-2">
          Welcome to Journalio
        </h1>
        <p className="text-sm text-muted-foreground">
          The trading journal that closes the feedback loop.
        </p>
      </div>

      {/* Compact feedback-loop visual */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {[
          { icon: ClipboardList, label: 'Pre-Session' },
          { icon: TrendingUp, label: 'Trade' },
          { icon: BookOpen, label: 'Post-Session' },
        ].map(({ icon: Icon, label }, i, arr) => (
          <div key={label} className="flex items-center gap-2">
            <div className="flex flex-col items-center gap-1 rounded-lg border bg-card px-3 py-2">
              <Icon className="h-4 w-4 text-primary" />
              <span className="text-[11px] font-medium">{label}</span>
            </div>
            {i < arr.length - 1 && (
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            )}
          </div>
        ))}
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-xs font-medium mb-1.5 block">Display name</label>
          <Input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="How should we call you? (optional)"
            className="text-sm"
          />
        </div>

        <div>
          <label className="text-xs font-medium mb-1.5 block">Timezone</label>
          <Popover open={tzOpen} onOpenChange={setTzOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={tzOpen}
                className="w-full justify-between text-xs font-normal"
              >
                {timezone.replace(/_/g, ' ')}
                <svg className="ml-2 h-3 w-3 shrink-0 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                </svg>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="start">
              <Command>
                <CommandInput
                  placeholder="Search timezone..."
                  value={tzSearch}
                  onValueChange={setTzSearch}
                />
                <CommandList>
                  <CommandEmpty>No timezone found.</CommandEmpty>
                  <CommandGroup>
                    {(() => {
                      try {
                        return Intl.supportedValuesOf('timeZone')
                          .filter((tz: string) => tz.toLowerCase().includes(tzSearch.toLowerCase()))
                          .slice(0, 50)
                          .map((tz: string) => (
                            <CommandItem
                              key={tz}
                              value={tz}
                              onSelect={() => {
                                setTimezone(tz)
                                setTzOpen(false)
                                setTzSearch('')
                              }}
                            >
                              <span className={timezone === tz ? 'font-medium' : ''}>{tz.replace(/_/g, ' ')}</span>
                            </CommandItem>
                          ))
                      } catch {
                        return <CommandItem disabled>Timezone list unavailable</CommandItem>
                      }
                    })()}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          <p className="text-[11px] text-muted-foreground mt-1">
            Determines when your trading day starts and resets.
          </p>
        </div>

        <div>
          <label className="text-xs font-medium mb-1.5 block">Trading start time</label>
          <input
            type="time"
            value={tradingStartTime}
            onChange={(e) => setTradingStartTime(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          <p className="text-[11px] text-muted-foreground mt-1">
            When your trading day begins (pre-session resets at this time).
          </p>
        </div>

        <div className="pt-2">
          <Button onClick={handleSave} disabled={saving} size="lg" className="w-full">
            {saving ? 'Saving...' : "Let's get started"}
            {!saving && <ArrowRight className="ml-2 h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  )
}

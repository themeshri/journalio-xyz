'use client'

import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
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

interface TimezoneStepProps {
  onNext: () => void
}

export function TimezoneStep({ onNext }: TimezoneStepProps) {
  const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone
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
        body: JSON.stringify({ timezone, tradingStartTime }),
      })
      if (res.ok) {
        onNext()
      } else {
        toast.error('Failed to save timezone')
      }
    } catch {
      toast.error('Failed to save timezone')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-xl font-semibold mb-2">Set Your Timezone</h2>
        <p className="text-sm text-muted-foreground">
          We use your timezone to determine when your trading day starts and resets.
        </p>
      </div>

      <div className="space-y-5">
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
        </div>

        <div>
          <label className="text-xs font-medium mb-1.5 block">Trading Start Time</label>
          <p className="text-xs text-muted-foreground mb-2">
            When your trading day begins (pre-session resets at this time)
          </p>
          <input
            type="time"
            value={tradingStartTime}
            onChange={(e) => setTradingStartTime(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Continue'}
            {!saving && <ArrowRight className="ml-2 h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  )
}

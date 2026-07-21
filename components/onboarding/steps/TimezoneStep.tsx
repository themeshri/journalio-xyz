'use client'

import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { Button, Input, Autocomplete, AutocompleteItem } from '@heroui/react'
import { toast } from 'sonner'

interface TimezoneStepProps {
  onNext: () => void
}

export function TimezoneStep({ onNext }: TimezoneStepProps) {
  const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone
  const [timezone, setTimezone] = useState(browserTz)
  const [tradingStartTime, setTradingStartTime] = useState('09:00')
  const [saving, setSaving] = useState(false)

  // Timezone options for the HeroUI Autocomplete (replaces the shadcn
  // Popover+Command combobox). Autocomplete does its own filtering.
  const timezones: string[] = (() => {
    try {
      return Intl.supportedValuesOf('timeZone')
    } catch {
      return []
    }
  })()

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
        <Autocomplete
          label="Timezone"
          labelPlacement="outside"
          placeholder="Search timezone..."
          defaultItems={timezones.map((tz) => ({ key: tz, label: tz.replace(/_/g, ' ') }))}
          selectedKey={timezone || null}
          onSelectionChange={(key) => {
            if (key) setTimezone(String(key))
          }}
        >
          {(item: { key: string; label: string }) => (
            <AutocompleteItem key={item.key}>{item.label}</AutocompleteItem>
          )}
        </Autocomplete>

        <div>
          <p className="text-xs font-medium mb-1.5">Trading Start Time</p>
          <p className="text-xs text-muted-foreground mb-2">
            When your trading day begins (pre-session resets at this time)
          </p>
          <Input
            type="time"
            value={tradingStartTime}
            onValueChange={setTradingStartTime}
            aria-label="Trading start time"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Button onPress={handleSave} color="primary" isDisabled={saving}>
            {saving ? 'Saving...' : 'Continue'}
            {!saving && <ArrowRight className="ml-2 h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  )
}

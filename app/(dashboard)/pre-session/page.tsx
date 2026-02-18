'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'

interface PreSessionData {
  energyLevel: number
  fatigueChecks: string[]
}

const fatigueItems = [
  {
    id: 'lazy-analysis',
    label: 'Lazy Analysis',
    description: "Skipping your full checklist because it 'looks close enough'?",
  },
  {
    id: 'impulse-reflex',
    label: 'Impulse Reflex',
    description: "Clicking 'Buy' just to end the tension of watching a move?",
  },
  {
    id: 'rule-avoidance',
    label: 'Rule Avoidance',
    description: "Ignoring stop-loss placement because you don't want to think about the risk?",
  },
]

function getStorageKey() {
  const today = new Date().toISOString().slice(0, 10)
  return `journalio_pre_session_${today}`
}

function getEnergyDescription(level: number): { text: string; className: string } | null {
  if (level >= 1 && level <= 3)
    return { text: 'Fully Charged — Sharp, alert, capable of complex analysis', className: 'text-emerald-600' }
  if (level >= 4 && level <= 6)
    return { text: 'Partially Drained — Functional but distractible; stick to simpler setups', className: 'text-yellow-600' }
  if (level >= 7 && level <= 8)
    return { text: 'High Fatigue — High risk of impairment; heavy eyes or muscle tension', className: 'text-orange-600' }
  if (level >= 9)
    return { text: 'Tapped Out — Brain scattered; high probability of irrational decisions', className: 'text-red-600' }
  return null
}

export default function PreSessionPage() {
  const [energyLevel, setEnergyLevel] = useState(0)
  const [fatigueChecks, setFatigueChecks] = useState<string[]>([])
  const [saved, setSaved] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(getStorageKey())
      if (raw) {
        const data: PreSessionData = JSON.parse(raw)
        setEnergyLevel(data.energyLevel || 0)
        setFatigueChecks(data.fatigueChecks || [])
      }
    } catch {}
    setLoaded(true)
  }, [])

  function handleSave() {
    const data: PreSessionData = { energyLevel, fatigueChecks }
    localStorage.setItem(getStorageKey(), JSON.stringify(data))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function toggleFatigueCheck(id: string) {
    setFatigueChecks((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    )
  }

  const energyDesc = getEnergyDescription(energyLevel)

  function getEnergyColor(): string {
    if (energyLevel >= 1 && energyLevel <= 3) return 'bg-emerald-500 text-white'
    if (energyLevel >= 4 && energyLevel <= 6) return 'bg-yellow-500 text-white'
    if (energyLevel >= 7 && energyLevel <= 8) return 'bg-orange-500 text-white'
    if (energyLevel >= 9) return 'bg-red-500 text-white'
    return 'bg-emerald-500 text-white'
  }

  if (!loaded) {
    return (
      <div className="pt-8">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    )
  }

  return (
    <div className="max-w-xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold">Pre Session</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Check in before you start trading
        </p>
      </div>

      <div className="space-y-6">
        {/* Energy Meter */}
        <section>
          <Label className="text-sm font-medium mb-2 block">Energy Meter</Label>
          <p className="text-xs text-muted-foreground mb-2">
            Rate your "starting battery" before the session begins
          </p>
          <div className="flex gap-0.5" role="group" aria-label="Energy level">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setEnergyLevel(n)}
                className={`w-8 h-8 text-sm rounded transition-colors ${
                  n <= energyLevel
                    ? getEnergyColor()
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
                aria-label={`Energy level ${n} out of 10`}
              >
                {n}
              </button>
            ))}
            {energyLevel > 0 && (
              <span className="ml-2 text-xs text-muted-foreground self-center font-mono tabular-nums">
                {energyLevel}/10
              </span>
            )}
          </div>

          {energyDesc && (
            <p className={`text-xs mt-2 ${energyDesc.className}`}>{energyDesc.text}</p>
          )}

          {energyLevel >= 9 && (
            <div className="mt-3 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-md">
              <p className="text-sm font-medium text-red-600">
                Recommendation: Do not trade today.
              </p>
            </div>
          )}
        </section>

        {/* Decision Fatigue Checklist — only when energy >= 7 */}
        {energyLevel >= 7 && (
          <>
            <Separator />
            <section>
              <Label className="text-sm font-medium mb-1 block">
                Decision Fatigue Checklist
              </Label>
              <p className="text-xs text-muted-foreground mb-3">
                Your fatigue score is high. Check for these behavioral leaks:
              </p>
              <div className="space-y-2">
                {fatigueItems.map((item) => (
                  <label
                    key={item.id}
                    className={`flex items-start gap-3 px-3 py-2.5 rounded-md border cursor-pointer transition-colors ${
                      fatigueChecks.includes(item.id)
                        ? 'border-orange-500 bg-orange-500/5 text-foreground'
                        : 'border-border text-muted-foreground hover:bg-muted/50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={fatigueChecks.includes(item.id)}
                      onChange={() => toggleFatigueCheck(item.id)}
                      className="sr-only"
                    />
                    <div>
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {item.description}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </section>
          </>
        )}

        <Separator />

        <div className="flex items-center gap-3">
          <Button size="sm" onClick={handleSave}>
            Save
          </Button>
          {saved && (
            <span className="text-xs text-emerald-600 font-medium">Saved</span>
          )}
        </div>
      </div>
    </div>
  )
}

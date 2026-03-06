'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { FormSkeleton } from '@/components/skeletons'
import { useMetadata } from '@/lib/wallet-context'
import { loadRules, type GlobalRule } from '@/lib/rules'
import {
  type PreSessionData,
  defaultPreSessionData,
  defaultMarketSnapshot,
  loadPreSession,
  savePreSession,
} from '@/lib/pre-sessions'
import { getTradingDay } from '@/lib/trading-day'
import { toast } from 'sonner'

const emotionalOptions = [
  'Calm',
  'Anxious',
  'Excited',
  'Frustrated',
  'Revenge-minded',
  'Euphoric',
]

function getEnergyDescription(level: number): { text: string; className: string } | null {
  if (level >= 8)
    return { text: 'Fully Charged — Sharp, alert, capable of complex analysis', className: 'text-amber-600' }
  if (level >= 5 && level <= 7)
    return { text: 'Partially Drained — Functional but distractible; stick to simpler setups', className: 'text-yellow-600' }
  if (level >= 3 && level <= 4)
    return { text: 'High Fatigue — High risk of impairment; heavy eyes or muscle tension', className: 'text-orange-600' }
  if (level >= 1 && level <= 2)
    return { text: 'Tapped Out — Brain scattered; high probability of irrational decisions', className: 'text-red-600' }
  return null
}

function getTodayDateUTC(): string {
  return new Date().toISOString().slice(0, 10)
}

async function fetchTradingDay(): Promise<string> {
  try {
    const res = await fetch('/api/settings')
    if (res.ok) {
      const settings = await res.json()
      return getTradingDay(settings.timezone || 'UTC', settings.tradingStartTime || '09:00')
    }
  } catch {}
  return getTodayDateUTC()
}

function formatDisplayDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatDisplayTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

export default function PreSessionPage() {
  const { reloadPreSessionStatus } = useMetadata()
  const [data, setData] = useState<PreSessionData>(defaultPreSessionData)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [globalRules, setGlobalRules] = useState<GlobalRule[]>([])
  const [isCompletedToday, setIsCompletedToday] = useState(false)
  const [displayDate, setDisplayDate] = useState('')
  const [displayTime, setDisplayTime] = useState('')

  useEffect(() => {
    let stale = false
    const now = new Date()
    setDisplayDate(formatDisplayDate(now))
    setDisplayTime(formatDisplayTime(now))

    Promise.all([fetchTradingDay(), loadRules()]).then(async ([today, loadedRules]) => {
      if (stale) return
      const session = await loadPreSession(today)
      if (stale) return
      if (session) {
        setData({ ...defaultPreSessionData, ...session })
        if (session.savedAt) {
          setIsCompletedToday(true)
        }
      }
      setGlobalRules(loadedRules)
      setLoaded(true)
    })

    return () => { stale = true }
  }, [])

  function update<K extends keyof PreSessionData>(key: K, value: PreSessionData[K]) {
    setData((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      const now = new Date()
      const todayDate = await fetchTradingDay()
      const savedData: PreSessionData = {
        ...data,
        date: todayDate,
        time: now.toTimeString().slice(0, 5),
        savedAt: now.toISOString(),
        marketSnapshot: data.marketSnapshot || defaultMarketSnapshot,
      }

      const result = await savePreSession(savedData)
      if (result) {
        setData(savedData)
        setIsCompletedToday(true)
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
        reloadPreSessionStatus()
        toast.success('Pre-session saved')
      } else {
        toast.error('Failed to save pre-session')
      }
    } finally {
      setSaving(false)
    }
  }

  function toggleArrayItem(key: 'rulesChecked', id: string) {
    setData((prev) => ({
      ...prev,
      [key]: prev[key].includes(id)
        ? prev[key].filter((c) => c !== id)
        : [...prev[key], id],
    }))
  }

  const energyDesc = getEnergyDescription(data.energyLevel)

  function getEnergyColor(): string {
    if (data.energyLevel >= 8) return 'bg-amber-500 text-white'
    if (data.energyLevel >= 5 && data.energyLevel <= 7) return 'bg-yellow-500 text-white'
    if (data.energyLevel >= 3 && data.energyLevel <= 4) return 'bg-orange-500 text-white'
    if (data.energyLevel >= 1 && data.energyLevel <= 2) return 'bg-red-500 text-white'
    return 'bg-amber-500 text-white'
  }

  if (!loaded) {
    return (
      <div className="max-w-xl pt-8">
        <h1 className="text-xl font-semibold mb-6">Pre Session</h1>
        <FormSkeleton fields={6} />
      </div>
    )
  }

  return (
    <div className="max-w-xl">
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold">Pre Session</h1>
          {isCompletedToday ? (
            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/30">
              Completed
            </span>
          ) : (
            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-muted text-muted-foreground border border-border">
              Not completed
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-0.5">
          Check in before you start trading
        </p>
      </div>

      <div className="space-y-6">
        {/* Market Snapshot */}
        <section>
          <details className="group">
            <summary className="flex items-center gap-2 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
              <Label className="text-sm font-medium cursor-pointer">Market Snapshot</Label>
              <span className="text-xs text-muted-foreground">(coming soon)</span>
              <svg className="w-3.5 h-3.5 text-muted-foreground transition-transform group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </summary>

            <div className="border border-border rounded-lg p-4 space-y-3 mt-2">
              <p className="text-sm text-foreground font-medium">
                {displayDate} &middot; {displayTime}
              </p>

              <div className="grid grid-cols-4 gap-3">
                {(['BTC', 'ETH', 'SOL', 'BNB'] as const).map((symbol) => (
                  <div key={symbol}>
                    <p className="text-xs text-muted-foreground">{symbol}</p>
                    <p className="text-sm font-mono text-muted-foreground/60">&mdash;</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Fear & Greed</p>
                  <p className="text-sm font-mono text-muted-foreground/60">&mdash;</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">24h Volume</p>
                  <p className="text-sm font-mono text-muted-foreground/60">&mdash;</p>
                </div>
              </div>
            </div>
          </details>
        </section>

        <Separator />

        {/* Section 1: Energy Meter */}
        <section>
          <Label className="text-sm font-medium mb-2 block">Energy Meter</Label>
          <p className="text-xs text-muted-foreground mb-2">
            Rate your "starting battery" before the session begins (1 = empty, 10 = fully charged)
          </p>
          <div className="flex gap-0.5" role="group" aria-label="Energy level">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => update('energyLevel', n)}
                className={`w-8 h-8 text-sm rounded transition-colors ${
                  n <= data.energyLevel
                    ? getEnergyColor()
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
                aria-label={`Energy level ${n} out of 10`}
              >
                {n}
              </button>
            ))}
            {data.energyLevel > 0 && (
              <span className="ml-2 text-xs text-muted-foreground self-center font-mono tabular-nums">
                {data.energyLevel}/10
              </span>
            )}
          </div>

          {energyDesc && (
            <p className={`text-xs mt-2 ${energyDesc.className}`}>{energyDesc.text}</p>
          )}

          {data.energyLevel >= 1 && data.energyLevel <= 2 && (
            <div className="mt-3 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-md">
              <p className="text-sm font-medium text-red-600">
                Recommendation: Do not trade today.
              </p>
            </div>
          )}
        </section>

        <Separator />

        {/* Section 3: Mindset & State */}
        <section>
          <Label className="text-sm font-medium mb-1 block">Mindset & State</Label>
          <p className="text-xs text-muted-foreground mb-3">
            How are you feeling right now?
          </p>

          <div className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">Emotional State</Label>
              <div className="flex flex-wrap gap-1.5">
                {emotionalOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => update('emotionalState', data.emotionalState === option ? '' : option)}
                    className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                      data.emotionalState === option
                        ? 'border-amber-500 bg-amber-500/10 text-amber-600 font-medium'
                        : 'border-border text-muted-foreground hover:bg-muted/50'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="session-intent" className="text-xs text-muted-foreground mb-2 block">
                Session Intent
              </Label>
              <Textarea
                id="session-intent"
                value={data.sessionIntent}
                onChange={(e) => update('sessionIntent', e.target.value)}
                placeholder="e.g., scalp 2 setups max, research only, manage open positions"
                rows={2}
                className="resize-none"
              />
            </div>
          </div>
        </section>

        <Separator />

        {/* Section 4: Session Limits */}
        <section>
          <Label className="text-sm font-medium mb-1 block">Session Limits</Label>
          <p className="text-xs text-muted-foreground mb-3">
            Set boundaries before you start
          </p>

          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label htmlFor="max-trades" className="text-xs text-muted-foreground mb-1.5 block">
                  Max Trades
                </Label>
                <Input
                  id="max-trades"
                  type="number"
                  min="0"
                  value={data.maxTrades}
                  onChange={(e) => update('maxTrades', e.target.value)}
                  placeholder="e.g., 3 trades"
                />
              </div>
              <div>
                <Label htmlFor="max-loss" className="text-xs text-muted-foreground mb-1.5 block">
                  Max Loss
                </Label>
                <Input
                  id="max-loss"
                  value={data.maxLoss}
                  onChange={(e) => update('maxLoss', e.target.value)}
                  placeholder="e.g., $50"
                />
              </div>
              <div>
                <Label htmlFor="time-limit" className="text-xs text-muted-foreground mb-1.5 block">
                  Time Limit
                </Label>
                <Input
                  id="time-limit"
                  value={data.timeLimit}
                  onChange={(e) => update('timeLimit', e.target.value)}
                  placeholder="e.g., 2 hours"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="position-size" className="text-xs text-muted-foreground mb-1.5 block">
                Default Position Size
              </Label>
              <Input
                id="position-size"
                value={data.defaultPositionSize}
                onChange={(e) => update('defaultPositionSize', e.target.value)}
                placeholder="e.g., 0.5 SOL"
              />
            </div>

            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">
                Do you have open positions to manage first?
              </Label>
              <div className="flex gap-2">
                {([true, false] as const).map((val) => (
                  <button
                    key={String(val)}
                    type="button"
                    onClick={() => update('hasOpenPositions', data.hasOpenPositions === val ? null : val)}
                    className={`px-4 py-1.5 text-sm rounded-md border transition-colors ${
                      data.hasOpenPositions === val
                        ? val
                          ? 'border-amber-500 bg-amber-500/10 text-amber-600 font-medium'
                          : 'border-zinc-500 bg-zinc-500/10 text-zinc-600 font-medium'
                        : 'border-border text-muted-foreground hover:bg-muted/50'
                    }`}
                  >
                    {val ? 'Yes' : 'No'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <Separator />

        {/* Section 5: Market Context */}
        <section>
          <Label className="text-sm font-medium mb-1 block">Market Context</Label>
          <p className="text-xs text-muted-foreground mb-3">
            What does the market look like right now?
          </p>

          <div className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">Market Sentiment</Label>
              <div className="flex gap-2">
                {(['Bullish', 'Neutral', 'Bearish'] as const).map((option) => {
                  const colorMap = {
                    Bullish: 'border-amber-500 bg-amber-500/10 text-amber-600',
                    Neutral: 'border-zinc-500 bg-zinc-500/10 text-zinc-600',
                    Bearish: 'border-red-500 bg-red-500/10 text-red-600',
                  }
                  const val = option.toLowerCase()
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => update('marketSentiment', data.marketSentiment === val ? '' : val)}
                      className={`px-4 py-1.5 text-sm rounded-md border transition-colors ${
                        data.marketSentiment === val
                          ? `${colorMap[option]} font-medium`
                          : 'border-border text-muted-foreground hover:bg-muted/50'
                      }`}
                    >
                      {option}
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">SOL Trend</Label>
              <div className="flex gap-2">
                {(['Up', 'Sideways', 'Down'] as const).map((option) => {
                  const colorMap = {
                    Up: 'border-amber-500 bg-amber-500/10 text-amber-600',
                    Sideways: 'border-zinc-500 bg-zinc-500/10 text-zinc-600',
                    Down: 'border-red-500 bg-red-500/10 text-red-600',
                  }
                  const val = option.toLowerCase()
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => update('solTrend', data.solTrend === val ? '' : val)}
                      className={`px-4 py-1.5 text-sm rounded-md border transition-colors ${
                        data.solTrend === val
                          ? `${colorMap[option]} font-medium`
                          : 'border-border text-muted-foreground hover:bg-muted/50'
                      }`}
                    >
                      {option}
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">
                Any major news or events today?
              </Label>
              <div className="flex gap-2">
                {([true, false] as const).map((val) => (
                  <button
                    key={String(val)}
                    type="button"
                    onClick={() => {
                      const newVal = data.majorNews === val ? null : val
                      setData((prev) => ({
                        ...prev,
                        majorNews: newVal,
                        majorNewsNote: newVal === false ? '' : prev.majorNewsNote,
                      }))
                    }}
                    className={`px-4 py-1.5 text-sm rounded-md border transition-colors ${
                      data.majorNews === val
                        ? val
                          ? 'border-yellow-500 bg-yellow-500/10 text-yellow-600 font-medium'
                          : 'border-zinc-500 bg-zinc-500/10 text-zinc-600 font-medium'
                        : 'border-border text-muted-foreground hover:bg-muted/50'
                    }`}
                  >
                    {val ? 'Yes' : 'No'}
                  </button>
                ))}
              </div>
              {data.majorNews === true && (
                <Input
                  value={data.majorNewsNote}
                  onChange={(e) => update('majorNewsNote', e.target.value)}
                  placeholder="What's happening?"
                  className="mt-2"
                />
              )}
            </div>

            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">
                Normal volume today?
              </Label>
              <div className="flex gap-2">
                {([true, false] as const).map((val) => (
                  <button
                    key={String(val)}
                    type="button"
                    onClick={() => update('normalVolume', data.normalVolume === val ? null : val)}
                    className={`px-4 py-1.5 text-sm rounded-md border transition-colors ${
                      data.normalVolume === val
                        ? val
                          ? 'border-amber-500 bg-amber-500/10 text-amber-600 font-medium'
                          : 'border-yellow-500 bg-yellow-500/10 text-yellow-600 font-medium'
                        : 'border-border text-muted-foreground hover:bg-muted/50'
                    }`}
                  >
                    {val ? 'Yes' : 'No'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <Separator />

        {/* Section 6: Rules Reminder */}
        <section>
          <Label className="text-sm font-medium mb-1 block">Rules Reminder</Label>
          <p className="text-xs text-muted-foreground mb-3">
            Acknowledge your rules before you start
          </p>
          {globalRules.length === 0 ? (
            <div className="border border-dashed rounded-md px-4 py-3">
              <p className="text-sm text-muted-foreground">
                No rules defined yet.{' '}
                <Link href="/strategies" className="text-amber-600 hover:underline">
                  Add rules on the Strategies page
                </Link>{' '}
                to see your checklist here.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {globalRules.map((rule) => (
                <label
                  key={rule.id}
                  htmlFor={`rule-${rule.id}`}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-md border cursor-pointer transition-colors ${
                    data.rulesChecked.includes(rule.id)
                      ? 'border-amber-500 bg-amber-500/5 text-foreground'
                      : 'border-border text-muted-foreground hover:bg-muted/50'
                  }`}
                >
                  <input
                    id={`rule-${rule.id}`}
                    type="checkbox"
                    checked={data.rulesChecked.includes(rule.id)}
                    onChange={() => toggleArrayItem('rulesChecked', rule.id)}
                    className="sr-only"
                    aria-label={`Acknowledge rule: ${rule.text}`}
                  />
                  <span className="text-sm">{rule.text}</span>
                </label>
              ))}
            </div>
          )}
        </section>

        <Separator />

        <div className="flex items-center gap-3">
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
          {saved && (
            <span className="text-xs text-amber-600 font-medium">Saved</span>
          )}
        </div>
      </div>
    </div>
  )
}

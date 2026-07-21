'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button, Input, Textarea, Divider } from '@heroui/react'
import { FormSkeleton } from '@/components/skeletons'
import { Check } from 'lucide-react'
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
import { RatingScale } from '@/components/ui/rating-scale'
import { YesNoToggle } from '@/components/ui/yes-no-toggle'

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
    return { text: 'Fully Charged — Sharp, alert, capable of complex analysis', className: 'text-emerald-600' }
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
            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/30">
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
        {/* Section 1: Energy Meter */}
        <section>
          <p className="text-sm font-medium mb-2">Energy Meter</p>
          <p className="text-xs text-muted-foreground mb-2">
            Rate your "starting battery" before the session begins (1 = empty, 10 = fully charged)
          </p>
          <RatingScale
            value={data.energyLevel}
            onChange={(n) => update('energyLevel', n)}
            label=""
          />

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

        <Divider />

        {/* Section 3: Mindset & State */}
        <section>
          <p className="text-sm font-medium mb-1">Mindset & State</p>
          <p className="text-xs text-muted-foreground mb-3">
            How are you feeling right now?
          </p>

          <div className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground mb-2">Emotional State</p>
              <div className="flex flex-wrap gap-1.5">
                {emotionalOptions.map((option) => (
                  <Button
                    key={option}
                    size="sm"
                    variant={data.emotionalState === option ? 'solid' : 'bordered'}
                    color={data.emotionalState === option ? 'primary' : 'default'}
                    onPress={() => update('emotionalState', data.emotionalState === option ? '' : option)}
                  >
                    {option}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <Textarea
                id="session-intent"
                label="Session Intent"
                labelPlacement="outside"
                value={data.sessionIntent}
                onValueChange={(v) => update('sessionIntent', v)}
                placeholder="e.g. Focus on SOL pairs only. Max 2 scalps. Stick to 5-minute chart setups. No trading in first 30 minutes."
                rows={2}
                className="resize-none"
              />
            </div>
          </div>
        </section>

        <Divider />

        {/* Section 4: Session Limits */}
        <section>
          <p className="text-sm font-medium mb-1">Session Limits</p>
          <p className="text-xs text-muted-foreground mb-3">
            Set boundaries before you start
          </p>

          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Input
                  id="max-trades"
                  size="sm"
                  label="Max Trades"
                  labelPlacement="outside"
                  type="number"
                  min="0"
                  value={data.maxTrades}
                  onValueChange={(v) => update('maxTrades', v)}
                  placeholder="e.g., 3 trades"
                />
              </div>
              <div>
                <Input
                  id="max-loss"
                  size="sm"
                  label="Max Loss"
                  labelPlacement="outside"
                  value={data.maxLoss}
                  onValueChange={(v) => update('maxLoss', v)}
                  placeholder="e.g., $50"
                />
              </div>
              <div>
                <Input
                  id="time-limit"
                  size="sm"
                  label="Time Limit"
                  labelPlacement="outside"
                  value={data.timeLimit}
                  onValueChange={(v) => update('timeLimit', v)}
                  placeholder="e.g., 2 hours"
                />
              </div>
            </div>

            <div>
              <Input
                id="position-size"
                size="sm"
                label="Default Position Size"
                labelPlacement="outside"
                value={data.defaultPositionSize}
                onValueChange={(v) => update('defaultPositionSize', v)}
                placeholder="e.g., 0.5 SOL"
              />
            </div>

            <div>
              <p className="text-xs text-muted-foreground mb-2">
                Do you have open positions to manage first?
              </p>
              <YesNoToggle
                value={data.hasOpenPositions}
                onChange={(val) => update('hasOpenPositions', val)}
              />
            </div>
          </div>
        </section>

        <Divider />

        {/* Section 5: Market Context */}
        <section>
          <p className="text-sm font-medium mb-1">Market Context</p>
          <p className="text-xs text-muted-foreground mb-3">
            What does the market look like right now?
          </p>

          <div className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground mb-2">Market Sentiment</p>
              <div className="flex gap-2">
                {(['Bullish', 'Neutral', 'Bearish'] as const).map((option) => {
                  const val = option.toLowerCase()
                  return (
                    <Button
                      key={option}
                      size="sm"
                      variant={data.marketSentiment === val ? 'solid' : 'bordered'}
                      color={data.marketSentiment === val ? 'primary' : 'default'}
                      onPress={() => update('marketSentiment', data.marketSentiment === val ? '' : val)}
                    >
                      {option}
                    </Button>
                  )
                })}
              </div>
            </div>

            <div>
              <p className="text-xs text-muted-foreground mb-2">SOL Trend</p>
              <div className="flex gap-2">
                {(['Up', 'Sideways', 'Down'] as const).map((option) => {
                  const val = option.toLowerCase()
                  return (
                    <Button
                      key={option}
                      size="sm"
                      variant={data.solTrend === val ? 'solid' : 'bordered'}
                      color={data.solTrend === val ? 'primary' : 'default'}
                      onPress={() => update('solTrend', data.solTrend === val ? '' : val)}
                    >
                      {option}
                    </Button>
                  )
                })}
              </div>
            </div>

            <div>
              <p className="text-xs text-muted-foreground mb-2">
                Any major news or events today?
              </p>
              <YesNoToggle
                value={data.majorNews}
                onChange={(val) => {
                  setData((prev) => ({
                    ...prev,
                    majorNews: val,
                    majorNewsNote: val === false ? '' : prev.majorNewsNote,
                  }))
                }}
              />
              {data.majorNews === true && (
                <Input
                  size="sm"
                  aria-label="Major news note"
                  value={data.majorNewsNote}
                  onValueChange={(v) => update('majorNewsNote', v)}
                  placeholder="What's happening?"
                  className="mt-2"
                />
              )}
            </div>

            <div>
              <p className="text-xs text-muted-foreground mb-2">
                Normal volume today?
              </p>
              <YesNoToggle
                value={data.normalVolume}
                onChange={(val) => update('normalVolume', val)}
              />
            </div>
          </div>
        </section>

        <Divider />

        {/* Section 6: Rules Reminder */}
        <section>
          <p className="text-sm font-medium mb-1">Rules Reminder</p>
          <p className="text-xs text-muted-foreground mb-3">
            Acknowledge your rules before you start
          </p>
          {globalRules.length === 0 ? (
            <div className="border border-dashed rounded-md px-4 py-3">
              <p className="text-sm text-muted-foreground">
                No rules defined yet.{' '}
                <Link href="/strategies" className="text-emerald-600 hover:underline">
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
                      ? 'border-emerald-500 bg-emerald-500/5 text-foreground'
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
                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                    data.rulesChecked.includes(rule.id)
                      ? 'border-emerald-500 bg-emerald-500 text-white'
                      : 'border-zinc-300 dark:border-zinc-600'
                  }`}>
                    {data.rulesChecked.includes(rule.id) && <Check className="h-3.5 w-3.5" />}
                  </span>
                  <span className="text-sm">{rule.text}</span>
                </label>
              ))}
            </div>
          )}
        </section>

        <Divider />

        {/* Market Snapshot (coming soon) */}
        <section>
          <details className="group">
            <summary className="flex items-center gap-2 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
              <span className="text-sm font-medium cursor-pointer">Market Snapshot</span>
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

        <Divider />

        <div className="flex items-center gap-3">
          <Button size="sm" color="primary" onPress={handleSave} isDisabled={saving}>
            {saving ? 'Saving...' : isCompletedToday ? 'Update Pre-Session' : 'Save Pre-Session'}
          </Button>
          {saved && (
            <span className="text-xs text-emerald-600 font-medium">Saved</span>
          )}
        </div>
      </div>
    </div>
  )
}

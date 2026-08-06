'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { FormSkeleton } from '@/components/skeletons'
import { toast } from 'sonner'
import { useMetadata, useWallet } from '@/lib/wallet-context'
import {
  type PostSessionData,
  defaultPostSessionData,
  loadPostSession,
  savePostSession,
} from '@/lib/post-sessions'
import { type PreSessionData, loadPreSession } from '@/lib/pre-sessions'
import { getTradingDay } from '@/lib/trading-day'
import { RatingScale } from '@/components/ui/rating-scale'
import { YesNoToggle } from '@/components/ui/yes-no-toggle'
import {
  computeLimitBreaches,
  NARRATIVE_STAGES,
  type LimitKind,
} from '@/lib/session-framework'

const emotionalOptions = [
  'Calm',
  'Satisfied',
  'Anxious',
  'Frustrated',
  'Euphoric',
  'Exhausted',
  'Neutral',
]

function getTodayDateUTC() {
  return new Date().toISOString().split('T')[0]
}

export default function PostSessionPage() {
  // timezone/tradingStartTime come from context rather than a second
  // /api/settings fetch — they are already loaded by the dashboard payload.
  const { reloadPostSessionStatus, timezone, tradingStartTime } = useMetadata()
  const { flattenedTrades } = useWallet()
  const [data, setData] = useState<PostSessionData>({ ...defaultPostSessionData, date: getTodayDateUTC() })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [existingId, setExistingId] = useState<string | null>(null)
  /** The morning's plan, so the recap can be graded against it. */
  const [plan, setPlan] = useState<PreSessionData | null>(null)

  useEffect(() => {
    let stale = false
    const date = getTradingDay(timezone, tradingStartTime)
    setData((prev) => ({ ...prev, date }))

    Promise.all([loadPostSession(date), loadPreSession(date)]).then(
      ([existing, preSession]) => {
        if (stale) return
        if (existing) {
          setData({ ...defaultPostSessionData, ...existing, date })
          setExistingId(existing.id || null)
        }
        setPlan(preSession)
        setLoading(false)
      }
    )
    return () => { stale = true }
  }, [timezone, tradingStartTime])

  // Which limits the day actually crossed, derived from live trades rather
  // than asked — the user confirms rather than recalls.
  const detectedBreaches = useMemo<LimitKind[]>(() => {
    if (!plan?.savedAt) return []
    const startEpoch = new Date(plan.savedAt).getTime() / 1000
    const sessionTrades = flattenedTrades.filter((t) => t.startDate >= startEpoch)
    const sessionPL = sessionTrades
      .filter((t) => t.isComplete)
      .reduce((sum, t) => sum + t.profitLoss, 0)
    const elapsedMinutes = (Date.now() / 1000 - startEpoch) / 60

    return computeLimitBreaches({
      maxTrades: plan.maxTrades,
      maxLoss: plan.maxLoss,
      timeLimit: plan.timeLimit,
      tradeCount: sessionTrades.length,
      sessionPL,
      elapsedMinutes,
    }).map((b) => b.kind)
  }, [plan, flattenedTrades])

  // Prefill the breach list once, on a recap that hasn't been saved yet.
  // Never overwrite what the user already confirmed.
  useEffect(() => {
    if (loading || existingId || detectedBreaches.length === 0) return
    setData((prev) =>
      prev.limitsBreached.length > 0 ? prev : { ...prev, limitsBreached: detectedBreaches }
    )
  }, [loading, existingId, detectedBreaches])

  const handleSave = useCallback(async () => {
    setSaving(true)
    const saved = await savePostSession(data)
    if (saved) {
      setExistingId(saved.id || null)
      toast.success('Post-session saved')
      reloadPostSessionStatus()
    } else {
      toast.error('Failed to save post-session')
    }
    setSaving(false)
  }, [data])

  const update = <K extends keyof PostSessionData>(key: K, value: PostSessionData[K]) => {
    setData((prev) => ({ ...prev, [key]: value }))
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-semibold">Post-Session Review</h1>
        <FormSkeleton />
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Post-Session Review</h1>
          <p className="text-xs text-muted-foreground mt-1">
            {data.date} {existingId && '(saved)'}
          </p>
        </div>
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : existingId ? 'Update' : 'Save'}
        </Button>
      </div>

      {/* This morning's plan — read-only, so the recap grades against
          something concrete rather than memory. */}
      <section>
        <Label className="text-sm font-medium mb-1 block">This morning&apos;s plan</Label>
        {plan ? (
          <div className="mt-2 rounded-md border border-border p-3 space-y-2 text-sm">
            {plan.sessionIntent && (
              <p>
                <span className="text-muted-foreground">Intent: </span>
                {plan.sessionIntent}
              </p>
            )}
            {plan.narrativeStage && (
              <p>
                <span className="text-muted-foreground">Narrative call: </span>
                {NARRATIVE_STAGES.find((s) => s.value === plan.narrativeStage)?.label ??
                  plan.narrativeStage}
                {plan.conviction > 0 && (
                  <span className="text-muted-foreground"> · conviction {plan.conviction}/10</span>
                )}
              </p>
            )}
            {plan.watchlist?.length > 0 && (
              <p>
                <span className="text-muted-foreground">Watchlist: </span>
                {plan.watchlist.map((w) => w.symbol).filter(Boolean).join(', ') || '—'}
              </p>
            )}
            {(plan.maxTrades || plan.maxLoss || plan.timeLimit) && (
              <p>
                <span className="text-muted-foreground">Limits: </span>
                {[
                  plan.maxTrades && `${plan.maxTrades} trades`,
                  plan.maxLoss && `${plan.maxLoss} loss`,
                  plan.timeLimit && `${plan.timeLimit} time`,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            )}
            {plan.planAdherenceIntent && (
              <p>
                <span className="text-muted-foreground">Rule most at risk: </span>
                {plan.planAdherenceIntent}
              </p>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground mt-1">
            No pre-session was saved for {data.date}, so there&apos;s no plan to grade
            against.{' '}
            <Link href="/diary/pre-session" className="underline hover:text-foreground">
              Start one tomorrow
            </Link>
            .
          </p>
        )}
      </section>

      <Separator />

      {/* Plan vs outcome */}
      <section className="space-y-4">
        <div>
          <Label className="text-sm font-medium mb-1 block">Plan vs outcome</Label>
          <p className="text-xs text-muted-foreground">
            Did execution match the plan?
          </p>
        </div>

        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">
            Followed the plan
          </Label>
          <YesNoToggle
            value={data.followedPlan}
            onChange={(v) => update('followedPlan', v)}
          />
        </div>

        {data.followedPlan === false && (
          <div>
            <Label htmlFor="plan-deviations" className="text-xs text-muted-foreground mb-1.5 block">
              Where did you deviate?
            </Label>
            <Textarea
              id="plan-deviations"
              value={data.planDeviations}
              onChange={(e) => update('planDeviations', e.target.value)}
              placeholder="e.g. Took a fourth trade after hitting the limit, chasing a breakout."
              rows={2}
              className="resize-none"
            />
          </div>
        )}

        <div>
          <Label htmlFor="fomo-entries" className="text-xs text-muted-foreground mb-1.5 block">
            Entries taken on FOMO
          </Label>
          <Input
            id="fomo-entries"
            type="number"
            min={0}
            value={data.fomoEntries || ''}
            onChange={(e) => {
              const n = parseInt(e.target.value, 10)
              update('fomoEntries', Number.isFinite(n) && n >= 0 ? n : 0)
            }}
            placeholder="0"
            className="max-w-24"
          />
        </div>

        {plan?.narrativeStage && (
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">
              Was the morning narrative call right?
            </Label>
            <YesNoToggle
              value={data.narrativeCallCorrect}
              onChange={(v) => update('narrativeCallCorrect', v)}
            />
          </div>
        )}

        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">
            Limits breached
          </Label>
          {detectedBreaches.length > 0 && (
            <p className="text-xs text-muted-foreground mb-2">
              Detected from today&apos;s trades — uncheck any that are wrong.
            </p>
          )}
          <div className="flex flex-wrap gap-1.5">
            {(['trades', 'loss', 'time'] as LimitKind[]).map((kind) => {
              const on = data.limitsBreached.includes(kind)
              return (
                <button
                  key={kind}
                  type="button"
                  aria-pressed={on}
                  onClick={() =>
                    update(
                      'limitsBreached',
                      on
                        ? data.limitsBreached.filter((k) => k !== kind)
                        : [...data.limitsBreached, kind]
                    )
                  }
                  className={`px-3 py-1.5 text-sm rounded-md border transition-colors capitalize ${
                    on
                      ? 'border-red-500 bg-red-500/10 text-red-600 font-medium'
                      : 'border-border text-muted-foreground hover:bg-muted/50'
                  }`}
                >
                  {kind}
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">
            Process rating
          </Label>
          <p className="text-xs text-muted-foreground mb-2">
            Rate how well you executed, independent of whether you made money.
          </p>
          <RatingScale
            value={data.processRating}
            onChange={(n) => update('processRating', n)}
            size="sm"
            lowLabel="Poor"
            highLabel="Excellent"
          />
        </div>
      </section>

      <Separator />

      {/* Rating */}
      <div>
        <Label className="text-sm mb-2">Overall Session Rating</Label>
        <div className="mt-1.5">
          <RatingScale
            value={data.rating}
            onChange={(n) => update('rating', n)}
            lowLabel="Poor"
            highLabel="Excellent"
          />
        </div>
      </div>

      {/* Emotional State */}
      <div>
        <Label className="text-sm">Emotional State at End</Label>
        <p className="text-xs text-muted-foreground mt-0.5 mb-2">How are you feeling after this session?</p>
        <div className="flex flex-wrap gap-1.5">
          {emotionalOptions.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => update('emotionalState', data.emotionalState === option ? '' : option)}
              className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                data.emotionalState === option
                  ? 'border-primary bg-primary/10 text-primary font-medium'
                  : 'border-border text-muted-foreground hover:bg-muted/50'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      {/* What Went Well */}
      <div>
        <Label htmlFor="well" className="text-sm">What Went Well</Label>
        <Textarea
          id="well"
          value={data.whatWentWell}
          onChange={(e) => update('whatWentWell', e.target.value)}
          placeholder='e.g. "Stuck to stop losses on all 3 trades. Waited for confirmation before entering."'
          rows={3}
          className="mt-1.5"
        />
      </div>

      {/* What Went Wrong */}
      <div>
        <Label htmlFor="wrong" className="text-sm">What Went Wrong</Label>
        <Textarea
          id="wrong"
          value={data.whatWentWrong}
          onChange={(e) => update('whatWentWrong', e.target.value)}
          placeholder='e.g. "Chased the second trade after missing the entry. Got in late."'
          rows={3}
          className="mt-1.5"
        />
      </div>

      {/* Key Lessons */}
      <div>
        <Label htmlFor="lessons" className="text-sm">Key Lessons</Label>
        <Textarea
          id="lessons"
          value={data.keyLessons}
          onChange={(e) => update('keyLessons', e.target.value)}
          placeholder={"e.g. \"Don't trade the first 15 minutes. Volume confirmation matters.\""}
          rows={3}
          className="mt-1.5"
        />
      </div>

      {/* Rules Followed */}
      <div>
        <Label className="text-sm">Did you follow your rules?</Label>
        <div className="mt-1.5">
          <YesNoToggle
            value={data.rulesFollowed}
            onChange={(val) => update('rulesFollowed', val)}
          />
        </div>
        <Textarea
          value={data.rulesNotes}
          onChange={(e) => update('rulesNotes', e.target.value)}
          placeholder="Notes on rule adherence..."
          rows={2}
          className="mt-2"
        />
      </div>

      {/* Plan for Tomorrow */}
      <div>
        <Label htmlFor="plan" className="text-sm">Plan for Tomorrow</Label>
        <Textarea
          id="plan"
          value={data.planForTomorrow}
          onChange={(e) => update('planForTomorrow', e.target.value)}
          placeholder='e.g. "Only trade if SOL is above 200 EMA. Max 2 trades."'
          rows={3}
          className="mt-1.5"
        />
      </div>

      {/* Bottom save */}
      <div className="flex justify-end pb-4">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : existingId ? 'Update Post-Session' : 'Save Post-Session'}
        </Button>
      </div>
    </div>
  )
}

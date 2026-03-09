'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { FormSkeleton } from '@/components/skeletons'
import { toast } from 'sonner'
import { useMetadata } from '@/lib/wallet-context'
import {
  type PostSessionData,
  defaultPostSessionData,
  loadPostSession,
  savePostSession,
} from '@/lib/post-sessions'
import { getTradingDay } from '@/lib/trading-day'
import { RatingScale } from '@/components/ui/rating-scale'
import { YesNoToggle } from '@/components/ui/yes-no-toggle'

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

export default function PostSessionPage() {
  const { reloadPostSessionStatus } = useMetadata()
  const [data, setData] = useState<PostSessionData>({ ...defaultPostSessionData, date: getTodayDateUTC() })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [existingId, setExistingId] = useState<string | null>(null)

  useEffect(() => {
    let stale = false
    fetchTradingDay().then((date) => {
      if (stale) return
      setData((prev) => ({ ...prev, date }))
      loadPostSession(date).then((existing) => {
        if (stale) return
        if (existing) {
          setData({ ...existing, date })
          setExistingId(existing.id || null)
        }
        setLoading(false)
      })
    })
    return () => { stale = true }
  }, [])

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

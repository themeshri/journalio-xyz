'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button, Textarea } from '@heroui/react'
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
        <Button size="sm" color="primary" onPress={handleSave} isDisabled={saving}>
          {saving ? 'Saving...' : existingId ? 'Update' : 'Save'}
        </Button>
      </div>

      {/* Rating */}
      <div>
        <p className="text-sm mb-2">Overall Session Rating</p>
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
        <p className="text-sm">Emotional State at End</p>
        <p className="text-xs text-muted-foreground mt-0.5 mb-2">How are you feeling after this session?</p>
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

      {/* What Went Well */}
      <div>
        <p className="text-sm mb-1.5">What Went Well</p>
        <Textarea
          aria-label="What Went Well"
          value={data.whatWentWell}
          onValueChange={(val) => update('whatWentWell', val)}
          placeholder='e.g. "Stuck to stop losses on all 3 trades. Waited for confirmation before entering."'
          minRows={3}
        />
      </div>

      {/* What Went Wrong */}
      <div>
        <p className="text-sm mb-1.5">What Went Wrong</p>
        <Textarea
          aria-label="What Went Wrong"
          value={data.whatWentWrong}
          onValueChange={(val) => update('whatWentWrong', val)}
          placeholder='e.g. "Chased the second trade after missing the entry. Got in late."'
          minRows={3}
        />
      </div>

      {/* Key Lessons */}
      <div>
        <p className="text-sm mb-1.5">Key Lessons</p>
        <Textarea
          aria-label="Key Lessons"
          value={data.keyLessons}
          onValueChange={(val) => update('keyLessons', val)}
          placeholder={"e.g. \"Don't trade the first 15 minutes. Volume confirmation matters.\""}
          minRows={3}
        />
      </div>

      {/* Rules Followed */}
      <div>
        <p className="text-sm mb-1.5">Did you follow your rules?</p>
        <div className="mt-1.5">
          <YesNoToggle
            value={data.rulesFollowed}
            onChange={(val) => update('rulesFollowed', val)}
          />
        </div>
        <Textarea
          aria-label="Notes on rule adherence"
          value={data.rulesNotes}
          onValueChange={(val) => update('rulesNotes', val)}
          placeholder="Notes on rule adherence..."
          minRows={2}
          className="mt-2"
        />
      </div>

      {/* Plan for Tomorrow */}
      <div>
        <p className="text-sm mb-1.5">Plan for Tomorrow</p>
        <Textarea
          aria-label="Plan for Tomorrow"
          value={data.planForTomorrow}
          onValueChange={(val) => update('planForTomorrow', val)}
          placeholder='e.g. "Only trade if SOL is above 200 EMA. Max 2 trades."'
          minRows={3}
        />
      </div>

      {/* Bottom save */}
      <div className="flex justify-end pb-4">
        <Button color="primary" onPress={handleSave} isDisabled={saving}>
          {saving ? 'Saving...' : existingId ? 'Update Post-Session' : 'Save Post-Session'}
        </Button>
      </div>
    </div>
  )
}

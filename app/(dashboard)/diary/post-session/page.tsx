'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FormSkeleton } from '@/components/skeletons'
import { toast } from 'sonner'
import {
  type PostSessionData,
  defaultPostSessionData,
  loadPostSession,
  savePostSession,
} from '@/lib/post-sessions'

const emotionalOptions = [
  'Calm',
  'Satisfied',
  'Anxious',
  'Frustrated',
  'Euphoric',
  'Exhausted',
  'Neutral',
]

function getTodayDate() {
  return new Date().toISOString().split('T')[0]
}

export default function PostSessionPage() {
  const [data, setData] = useState<PostSessionData>({ ...defaultPostSessionData, date: getTodayDate() })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [existingId, setExistingId] = useState<string | null>(null)

  useEffect(() => {
    let stale = false
    const date = getTodayDate()
    loadPostSession(date).then((existing) => {
      if (stale) return
      if (existing) {
        setData({ ...existing, date })
        setExistingId(existing.id || null)
      }
      setLoading(false)
    })
    return () => { stale = true }
  }, [])

  const handleSave = useCallback(async () => {
    setSaving(true)
    const saved = await savePostSession(data)
    if (saved) {
      setExistingId(saved.id || null)
      toast.success('Post-session saved')
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
        <div className="flex gap-1 mt-1.5">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => update('rating', n)}
              className={`w-8 h-8 text-sm rounded transition-colors ${
                n <= data.rating
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {n}
            </button>
          ))}
          {data.rating > 0 && (
            <span className="ml-2 text-sm text-muted-foreground self-center font-mono">
              {data.rating}/10
            </span>
          )}
        </div>
      </div>

      {/* Emotional State */}
      <div>
        <Label className="text-sm">Emotional State at End</Label>
        <Select value={data.emotionalState} onValueChange={(v) => update('emotionalState', v)}>
          <SelectTrigger className="mt-1.5">
            <SelectValue placeholder="How are you feeling?" />
          </SelectTrigger>
          <SelectContent>
            {emotionalOptions.map((opt) => (
              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* What Went Well */}
      <div>
        <Label htmlFor="well" className="text-sm">What Went Well</Label>
        <Textarea
          id="well"
          value={data.whatWentWell}
          onChange={(e) => update('whatWentWell', e.target.value)}
          placeholder="What were your best decisions today?"
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
          placeholder="What mistakes did you make? What would you do differently?"
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
          placeholder="What did you learn today?"
          rows={3}
          className="mt-1.5"
        />
      </div>

      {/* Rules Followed */}
      <div>
        <Label className="text-sm">Did you follow your rules?</Label>
        <div className="flex gap-2 mt-1.5">
          <button
            type="button"
            onClick={() => update('rulesFollowed', true)}
            className={`px-4 py-1.5 text-sm rounded-md border transition-colors ${
              data.rulesFollowed === true
                ? 'bg-emerald-600 text-white border-emerald-600'
                : 'bg-muted text-muted-foreground border-border hover:bg-muted/80'
            }`}
          >
            Yes
          </button>
          <button
            type="button"
            onClick={() => update('rulesFollowed', false)}
            className={`px-4 py-1.5 text-sm rounded-md border transition-colors ${
              data.rulesFollowed === false
                ? 'bg-red-600 text-white border-red-600'
                : 'bg-muted text-muted-foreground border-border hover:bg-muted/80'
            }`}
          >
            No
          </button>
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
          placeholder="What's your plan for the next session?"
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

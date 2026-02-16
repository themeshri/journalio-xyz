'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface PaperedPlay {
  id: string
  coinName: string
  mcWhenSaw: string
  ath: string
  reasonMissed: string
  createdAt: string
}

export default function MissedTradesPage() {
  const [plays, setPlays] = useState<PaperedPlay[]>([])
  const [showForm, setShowForm] = useState(false)
  const [coinName, setCoinName] = useState('')
  const [mcWhenSaw, setMcWhenSaw] = useState('')
  const [ath, setAth] = useState('')
  const [reasonMissed, setReasonMissed] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    fetchPlays()
  }, [])

  async function fetchPlays() {
    try {
      const res = await fetch('/api/papered-plays')
      if (res.ok) {
        const data = await res.json()
        setPlays(data)
      }
    } catch (err) {
      console.error('Failed to fetch papered plays:', err)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (
      !coinName.trim() ||
      !mcWhenSaw.trim() ||
      !ath.trim() ||
      !reasonMissed.trim()
    ) {
      alert('Please fill in all fields')
      return
    }

    setIsSaving(true)
    try {
      const res = await fetch('/api/papered-plays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coinName: coinName.trim(),
          mcWhenSaw: mcWhenSaw.trim(),
          ath: ath.trim(),
          reasonMissed: reasonMissed.trim(),
        }),
      })
      if (res.ok) {
        const newPlay = await res.json()
        setPlays([newPlay, ...plays])
        setCoinName('')
        setMcWhenSaw('')
        setAth('')
        setReasonMissed('')
        setShowForm(false)
      } else {
        alert('Failed to save')
      }
    } catch {
      alert('Failed to save')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this entry?')) return
    try {
      const res = await fetch(`/api/papered-plays/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setPlays(plays.filter((p) => p.id !== id))
      } else {
        alert('Failed to delete')
      }
    } catch {
      alert('Failed to delete')
    }
  }

  if (isLoading) {
    return (
      <div className="pt-8">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold">Missed Trades</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Trades you saw but didn't take
          </p>
        </div>
        <Button
          variant={showForm ? 'outline' : 'default'}
          size="sm"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? 'Cancel' : 'Add Entry'}
        </Button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="border border-border rounded-md p-5 mb-6 space-y-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="coinName" className="text-xs mb-1.5">
                Coin Name
              </Label>
              <Input
                id="coinName"
                value={coinName}
                onChange={(e) => setCoinName(e.target.value)}
                placeholder="e.g., BONK"
                maxLength={50}
                required
              />
            </div>
            <div>
              <Label htmlFor="mcWhenSaw" className="text-xs mb-1.5">
                MC When Saw
              </Label>
              <Input
                id="mcWhenSaw"
                value={mcWhenSaw}
                onChange={(e) => setMcWhenSaw(e.target.value)}
                placeholder="e.g., $500K"
                maxLength={30}
                required
              />
            </div>
            <div>
              <Label htmlFor="ath" className="text-xs mb-1.5">
                ATH
              </Label>
              <Input
                id="ath"
                value={ath}
                onChange={(e) => setAth(e.target.value)}
                placeholder="e.g., $50M"
                maxLength={30}
                required
              />
            </div>
          </div>
          <div>
            <Label htmlFor="reasonMissed" className="text-xs mb-1.5">
              Why I Missed
            </Label>
            <Textarea
              id="reasonMissed"
              value={reasonMissed}
              onChange={(e) => setReasonMissed(e.target.value)}
              placeholder="Why didn't you ape?"
              maxLength={500}
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Add Entry'}
            </Button>
          </div>
        </form>
      )}

      {plays.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No entries yet. Add one to start tracking missed opportunities.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Coin</TableHead>
              <TableHead>MC When Saw</TableHead>
              <TableHead>ATH</TableHead>
              <TableHead>Potential</TableHead>
              <TableHead className="hidden md:table-cell">Reason</TableHead>
              <TableHead className="hidden md:table-cell">Date</TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {plays.map((play) => (
              <TableRow key={play.id}>
                <TableCell className="font-semibold">{play.coinName}</TableCell>
                <TableCell className="font-mono text-xs tabular-nums">
                  {play.mcWhenSaw}
                </TableCell>
                <TableCell className="font-mono text-xs tabular-nums">
                  {play.ath}
                </TableCell>
                <TableCell className="font-mono text-xs tabular-nums text-emerald-600 font-medium">
                  {calculateGain(play.mcWhenSaw, play.ath)}
                </TableCell>
                <TableCell className="hidden md:table-cell text-xs text-muted-foreground max-w-[200px] truncate">
                  {play.reasonMissed}
                </TableCell>
                <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                  {new Date(play.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-destructive hover:text-destructive h-7"
                    onClick={() => handleDelete(play.id)}
                  >
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}

function calculateGain(mcWhenSaw: string, ath: string): string {
  try {
    const parseValue = (str: string): number => {
      const cleaned = str.replace(/[$,\s]/g, '').toUpperCase()
      if (cleaned.includes('K'))
        return parseFloat(cleaned.replace('K', '')) * 1000
      if (cleaned.includes('M'))
        return parseFloat(cleaned.replace('M', '')) * 1000000
      if (cleaned.includes('B'))
        return parseFloat(cleaned.replace('B', '')) * 1000000000
      return parseFloat(cleaned)
    }
    const saw = parseValue(mcWhenSaw)
    const athVal = parseValue(ath)
    if (isNaN(saw) || isNaN(athVal) || saw === 0) return '-'
    return `${(athVal / saw).toFixed(1)}x`
  } catch {
    return '-'
  }
}

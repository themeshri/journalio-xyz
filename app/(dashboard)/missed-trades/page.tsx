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
  contractAddr: string | null
  mcWhenSaw: string
  ath: string
  reasonMissed: string
  howToNotMiss: string | null
  attachment: string | null
  createdAt: string
}

export default function MissedTradesPage() {
  const [plays, setPlays] = useState<PaperedPlay[]>([])
  const [showForm, setShowForm] = useState(false)
  const [coinName, setCoinName] = useState('')
  const [contractAddr, setContractAddr] = useState('')
  const [mcWhenSaw, setMcWhenSaw] = useState('')
  const [ath, setAth] = useState('')
  const [reasonMissed, setReasonMissed] = useState('')
  const [howToNotMiss, setHowToNotMiss] = useState('')
  const [attachment, setAttachment] = useState<string | null>(null)
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
          contractAddr: contractAddr.trim() || null,
          mcWhenSaw: mcWhenSaw.trim(),
          ath: ath.trim(),
          reasonMissed: reasonMissed.trim(),
          howToNotMiss: howToNotMiss.trim() || null,
          attachment,
        }),
      })
      if (res.ok) {
        const newPlay = await res.json()
        setPlays([newPlay, ...plays])
        setCoinName('')
        setContractAddr('')
        setMcWhenSaw('')
        setAth('')
        setReasonMissed('')
        setHowToNotMiss('')
        setAttachment(null)
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
            <div className="md:col-span-2">
              <Label htmlFor="contractAddr" className="text-xs mb-1.5">
                Contract Address (optional)
              </Label>
              <Input
                id="contractAddr"
                value={contractAddr}
                onChange={(e) => setContractAddr(e.target.value)}
                placeholder="e.g., DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263"
                className="font-mono text-xs"
                maxLength={100}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          <div>
            <Label htmlFor="howToNotMiss" className="text-xs mb-1.5">
              How to not miss it next time?
            </Label>
            <Textarea
              id="howToNotMiss"
              value={howToNotMiss}
              onChange={(e) => setHowToNotMiss(e.target.value)}
              placeholder="What would you do differently? What signals should you watch for?"
              maxLength={500}
              rows={3}
            />
          </div>
          <div>
            <Label className="text-xs mb-1.5">Image</Label>
            {!attachment ? (
              <div>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    if (!file.type.startsWith('image/')) {
                      alert('Please upload an image file')
                      return
                    }
                    if (file.size > 5 * 1024 * 1024) {
                      alert('Image size should be less than 5MB')
                      return
                    }
                    const reader = new FileReader()
                    reader.onloadend = () => setAttachment(reader.result as string)
                    reader.readAsDataURL(file)
                  }}
                  className="hidden"
                  id="missed-image-upload"
                />
                <label
                  htmlFor="missed-image-upload"
                  className="flex items-center justify-center w-full px-4 py-4 border border-dashed border-border rounded-md cursor-pointer hover:border-primary hover:bg-muted/30 transition-colors"
                >
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Click to upload image</p>
                    <p className="text-xs text-muted-foreground mt-0.5">PNG, JPG, GIF up to 5MB</p>
                  </div>
                </label>
              </div>
            ) : (
              <div className="relative">
                <img
                  src={attachment}
                  alt="Missed trade attachment"
                  className="w-full max-h-48 object-contain rounded-md border border-border"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2 text-xs h-7"
                  onClick={() => setAttachment(null)}
                >
                  Remove
                </Button>
              </div>
            )}
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

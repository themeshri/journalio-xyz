'use client'

import { useState, useEffect, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { TableRowsSkeleton } from '@/components/skeletons'
import { loadStrategies, type Strategy } from '@/lib/strategies'
import { formatValue } from '@/lib/formatters'

// ─── Types ────────────────────────────────────────────────────

interface PaperedPlay {
  id: string
  coinName: string
  contractAddr: string | null
  tokenMint: string | null
  tokenSymbol: string | null
  tokenImage: string | null
  mcWhenSaw: string
  ath: string
  reasonMissed: string
  howToNotMiss: string | null
  attachment: string | null
  entryPrice: number | null
  entryTime: string | null
  exitPrice: number | null
  exitTime: string | null
  hypotheticalPositionSize: number | null
  outcome: string | null
  potentialMultiplier: number | null
  potentialPnL: number | null
  peakMultiplier: number | null
  missReason: string | null
  strategyId: string | null
  rulesMetCount: number | null
  rulesTotalCount: number | null
  notes: string
  createdAt: string
}

type MissReason = 'hesitation' | 'distracted' | 'no_capital' | 'risk_limit' | 'late_spotted' | 'low_conviction' | 'sleeping' | 'other'

const MISS_REASONS: { id: MissReason; emoji: string; label: string }[] = [
  { id: 'hesitation', emoji: '\ud83d\ude30', label: 'Hesitated' },
  { id: 'distracted', emoji: '\ud83d\udcf1', label: 'Distracted' },
  { id: 'no_capital', emoji: '\ud83d\udcb0', label: 'No Capital' },
  { id: 'risk_limit', emoji: '\u23f0', label: 'Risk Limit' },
  { id: 'late_spotted', emoji: '\u23f3', label: 'Spotted Late' },
  { id: 'low_conviction', emoji: '\ud83e\udd14', label: 'Low Conviction' },
  { id: 'sleeping', emoji: '\ud83d\ude34', label: 'Sleeping' },
  { id: 'other', emoji: '\ud83d\udcdd', label: 'Other' },
]

function getMissReasonLabel(reason: string | null): string {
  if (!reason) return '-'
  const found = MISS_REASONS.find((r) => r.id === reason)
  return found ? `${found.emoji} ${found.label}` : reason
}

// ─── Page ─────────────────────────────────────────────────────

export default function MissedTradesPage() {
  const [plays, setPlays] = useState<PaperedPlay[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [strategies, setStrategies] = useState<Strategy[]>([])

  // Filters
  const [filterReason, setFilterReason] = useState<string>('all')
  const [filterStrategy, setFilterStrategy] = useState<string>('all')

  // Form state
  const [formTokenMint, setFormTokenMint] = useState('')
  const [formCoinName, setFormCoinName] = useState('')
  const [formTokenSymbol, setFormTokenSymbol] = useState('')
  const [formTokenImage, setFormTokenImage] = useState('')
  const [formMissReason, setFormMissReason] = useState<MissReason | ''>('')
  const [formEntryPrice, setFormEntryPrice] = useState('')
  const [formPositionSize, setFormPositionSize] = useState('')
  const [formExitPrice, setFormExitPrice] = useState('')
  const [formPeakPrice, setFormPeakPrice] = useState('')
  const [formOutcome, setFormOutcome] = useState<string>('pending')
  const [formStrategyId, setFormStrategyId] = useState<string>('')
  const [formNotes, setFormNotes] = useState('')
  const [isFetching, setIsFetching] = useState(false)

  useEffect(() => {
    fetchPlays()
    loadStrategies().then(setStrategies)
  }, [])

  async function fetchPlays() {
    try {
      const res = await fetch('/api/papered-plays')
      if (res.ok) setPlays(await res.json())
    } catch (err) {
      console.error('Failed to fetch:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // Auto-fetch token data when mint address entered
  const fetchTokenData = useCallback(async (mint: string) => {
    if (!mint || mint.length < 30) return
    setIsFetching(true)
    try {
      const res = await fetch(`/api/solana/token/${mint}`)
      if (res.ok) {
        const data = await res.json()
        if (data.name) setFormCoinName(data.name)
        if (data.symbol) setFormTokenSymbol(data.symbol)
        if (data.image) setFormTokenImage(data.image)
      }
    } catch {
      // silently fail
    } finally {
      setIsFetching(false)
    }
  }, [])

  // Auto-calculations
  const entryPrice = parseFloat(formEntryPrice) || 0
  const exitPrice = parseFloat(formExitPrice) || 0
  const peakPrice = parseFloat(formPeakPrice) || 0
  const positionSize = parseFloat(formPositionSize) || 0
  const multiplier = entryPrice > 0 && exitPrice > 0 ? exitPrice / entryPrice : 0
  const peakMultiplier = entryPrice > 0 && peakPrice > 0 ? peakPrice / entryPrice : 0
  const potentialPnL = positionSize > 0 && multiplier > 0 ? positionSize * (multiplier - 1) : 0

  function resetForm() {
    setFormTokenMint('')
    setFormCoinName('')
    setFormTokenSymbol('')
    setFormTokenImage('')
    setFormMissReason('')
    setFormEntryPrice('')
    setFormPositionSize('')
    setFormExitPrice('')
    setFormPeakPrice('')
    setFormOutcome('pending')
    setFormStrategyId('')
    setFormNotes('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formCoinName.trim()) {
      toast.error('Token name is required')
      return
    }
    if (!formMissReason) {
      toast.error('Please select why you missed it')
      return
    }

    setIsSaving(true)
    try {
      const res = await fetch('/api/papered-plays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coinName: formCoinName.trim(),
          tokenMint: formTokenMint.trim() || null,
          tokenSymbol: formTokenSymbol.trim() || null,
          tokenImage: formTokenImage || null,
          mcWhenSaw: '',
          ath: '',
          reasonMissed: formMissReason,
          missReason: formMissReason,
          entryPrice: entryPrice || null,
          entryTime: new Date().toISOString(),
          exitPrice: exitPrice || null,
          hypotheticalPositionSize: positionSize || null,
          outcome: formOutcome || 'pending',
          potentialMultiplier: multiplier || null,
          potentialPnL: potentialPnL || null,
          peakMultiplier: peakMultiplier || null,
          strategyId: formStrategyId || null,
          notes: formNotes.trim(),
        }),
      })
      if (res.ok) {
        const newPlay = await res.json()
        setPlays([newPlay, ...plays])
        resetForm()
        setShowForm(false)
        toast.success('Missed trade logged')
      } else {
        toast.error('Failed to save')
      }
    } catch {
      toast.error('Failed to save')
    } finally {
      setIsSaving(false)
    }
  }

  async function executeDelete(id: string) {
    try {
      const res = await fetch(`/api/papered-plays/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setPlays(plays.filter((p) => p.id !== id))
      } else {
        toast.error('Failed to delete')
      }
    } catch {
      toast.error('Failed to delete')
    } finally {
      setDeleteId(null)
    }
  }

  // Filtered plays
  const filteredPlays = plays.filter((p) => {
    if (filterReason !== 'all' && p.missReason !== filterReason) return false
    if (filterStrategy !== 'all' && p.strategyId !== filterStrategy) return false
    return true
  })

  // Summary stats
  const totalMissed = filteredPlays.length
  const wouldBeWinners = filteredPlays.filter((p) => p.outcome === 'win' || (p.potentialPnL && p.potentialPnL > 0)).length
  const totalMissedProfit = filteredPlays.reduce((sum, p) => sum + (p.potentialPnL && p.potentialPnL > 0 ? p.potentialPnL : 0), 0)
  const avgMultiplier = filteredPlays.filter((p) => p.potentialMultiplier).length > 0
    ? filteredPlays.reduce((sum, p) => sum + (p.potentialMultiplier || 0), 0) / filteredPlays.filter((p) => p.potentialMultiplier).length
    : 0

  const activeStrategies = strategies.filter((s) => !s.isArchived)

  if (isLoading) {
    return (
      <div className="pt-8">
        <h1 className="text-xl font-semibold mb-6">Missed Trades</h1>
        <TableRowsSkeleton rows={3} cols={7} />
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold">Missed Trades</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Track trades you saw but didn't take</p>
        </div>
        <Button
          variant={showForm ? 'outline' : 'default'}
          size="sm"
          onClick={() => { setShowForm(!showForm); if (showForm) resetForm() }}
        >
          {showForm ? 'Cancel' : '+ Log Missed Trade'}
        </Button>
      </div>

      {/* ── Enhanced Form ── */}
      {showForm && (
        <form onSubmit={handleSubmit} className="border rounded-lg p-5 mb-6 space-y-5">
          {/* Token Section */}
          <div>
            <h3 className="text-sm font-medium mb-3">Token</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <Label className="text-xs mb-1.5">Token Address</Label>
                <div className="flex gap-2">
                  <Input
                    value={formTokenMint}
                    onChange={(e) => setFormTokenMint(e.target.value)}
                    onBlur={() => fetchTokenData(formTokenMint)}
                    placeholder="Paste mint address..."
                    className="font-mono text-xs"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isFetching || formTokenMint.length < 30}
                    onClick={() => fetchTokenData(formTokenMint)}
                  >
                    {isFetching ? '...' : 'Fetch'}
                  </Button>
                </div>
              </div>
              <div>
                <Label className="text-xs mb-1.5">Token Name *</Label>
                <Input
                  value={formCoinName}
                  onChange={(e) => setFormCoinName(e.target.value)}
                  placeholder="e.g., BONK"
                  required
                />
              </div>
            </div>
            {formTokenImage && (
              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                <img src={formTokenImage} alt="" className="w-5 h-5 rounded-full" />
                <span>{formCoinName}</span>
                {formTokenSymbol && <span className="text-muted-foreground/50">({formTokenSymbol})</span>}
              </div>
            )}
          </div>

          <Separator />

          {/* Miss Reason */}
          <div>
            <h3 className="text-sm font-medium mb-3">Why did you miss it? *</h3>
            <div className="grid grid-cols-4 gap-1.5">
              {MISS_REASONS.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setFormMissReason(r.id)}
                  className={`flex items-center gap-1.5 text-xs px-2.5 py-2 rounded-md border transition-colors ${
                    formMissReason === r.id
                      ? 'border-primary bg-primary/5 text-foreground'
                      : 'border-border text-muted-foreground hover:bg-muted/50'
                  }`}
                >
                  <span>{r.emoji}</span>
                  <span>{r.label}</span>
                </button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Hypothetical Trade */}
          <div>
            <h3 className="text-sm font-medium mb-3">Hypothetical Trade</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs mb-1.5">Entry Price ($)</Label>
                <Input
                  type="number"
                  step="any"
                  value={formEntryPrice}
                  onChange={(e) => setFormEntryPrice(e.target.value)}
                  placeholder="0.000034"
                />
              </div>
              <div>
                <Label className="text-xs mb-1.5">Position Size ($)</Label>
                <Input
                  type="number"
                  step="any"
                  value={formPositionSize}
                  onChange={(e) => setFormPositionSize(e.target.value)}
                  placeholder="100"
                />
              </div>
              <div>
                <Label className="text-xs mb-1.5">Exit/Current Price ($)</Label>
                <Input
                  type="number"
                  step="any"
                  value={formExitPrice}
                  onChange={(e) => setFormExitPrice(e.target.value)}
                  placeholder="0.000102"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
              <div>
                <Label className="text-xs mb-1.5">Peak Price ($)</Label>
                <Input
                  type="number"
                  step="any"
                  value={formPeakPrice}
                  onChange={(e) => setFormPeakPrice(e.target.value)}
                  placeholder="0.000145"
                />
              </div>
              <div>
                <Label className="text-xs mb-1.5">Outcome</Label>
                <RadioGroup value={formOutcome} onValueChange={setFormOutcome} className="flex gap-3 mt-1">
                  {['win', 'loss', 'breakeven', 'pending'].map((o) => (
                    <label key={o} className="flex items-center gap-1.5 text-xs cursor-pointer">
                      <RadioGroupItem value={o} />
                      <span className="capitalize">{o}</span>
                    </label>
                  ))}
                </RadioGroup>
              </div>
            </div>

            {/* Auto-calculated */}
            {(multiplier > 0 || potentialPnL !== 0) && (
              <div className="flex gap-4 mt-3 text-xs font-mono tabular-nums">
                {multiplier > 0 && (
                  <span className={multiplier >= 1 ? 'text-emerald-600' : 'text-red-600'}>
                    Multiplier: {multiplier.toFixed(1)}x
                  </span>
                )}
                {peakMultiplier > 0 && (
                  <span className="text-muted-foreground">
                    Peak: {peakMultiplier.toFixed(1)}x
                  </span>
                )}
                {potentialPnL !== 0 && (
                  <span className={potentialPnL >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                    P/L: {potentialPnL >= 0 ? '+' : ''}{formatValue(potentialPnL)}
                  </span>
                )}
              </div>
            )}
          </div>

          <Separator />

          {/* Strategy Fit */}
          {activeStrategies.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-3">Strategy Fit</h3>
              <Select value={formStrategyId} onValueChange={setFormStrategyId}>
                <SelectTrigger className="w-full md:w-64">
                  <SelectValue placeholder="Which strategy did this fit?" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No strategy</SelectItem>
                  {activeStrategies.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      <span className="flex items-center gap-1.5">
                        <span>{s.icon}</span>
                        <span>{s.name}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Notes */}
          <div>
            <Label className="text-xs mb-1.5">Notes</Label>
            <Textarea
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              placeholder="What happened? What did you learn?"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => { setShowForm(false); resetForm() }}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      )}

      {/* ── Filters ── */}
      {plays.length > 0 && (
        <div className="flex flex-wrap gap-3 mb-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Reason:</span>
            <Select value={filterReason} onValueChange={setFilterReason}>
              <SelectTrigger className="h-7 text-xs w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Reasons</SelectItem>
                {MISS_REASONS.map((r) => (
                  <SelectItem key={r.id} value={r.id}>{r.emoji} {r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {activeStrategies.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">Strategy:</span>
              <Select value={filterStrategy} onValueChange={setFilterStrategy}>
                <SelectTrigger className="h-7 text-xs w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Strategies</SelectItem>
                  {activeStrategies.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.icon} {s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}

      {/* ── Summary Stats ── */}
      {filteredPlays.length > 0 && (
        <div className="flex flex-wrap gap-x-8 gap-y-1 mb-4 text-xs text-muted-foreground">
          <span>{totalMissed} missed trade{totalMissed !== 1 ? 's' : ''}</span>
          {wouldBeWinners > 0 && <span>{wouldBeWinners} would have been winner{wouldBeWinners !== 1 ? 's' : ''}</span>}
          {totalMissedProfit > 0 && (
            <span className="text-emerald-600 font-medium">
              Missed profit: +{formatValue(totalMissedProfit)}
            </span>
          )}
          {avgMultiplier > 0 && (
            <span>Avg multiplier: {avgMultiplier.toFixed(1)}x</span>
          )}
        </div>
      )}

      {/* ── Table ── */}
      {filteredPlays.length === 0 ? (
        <div className="border border-dashed rounded-lg p-6 text-center">
          <p className="text-sm text-muted-foreground">
            {plays.length === 0
              ? 'No missed trades yet. Log one to start tracking opportunities.'
              : 'No trades match your filters.'}
          </p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Token</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Strategy</TableHead>
              <TableHead className="text-right">Multi</TableHead>
              <TableHead className="text-right">Pot. P/L</TableHead>
              <TableHead>Outcome</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPlays.map((play) => {
              const strat = play.strategyId ? strategies.find((s) => s.id === play.strategyId) : null
              return (
                <TableRow key={play.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {play.tokenImage && (
                        <img src={play.tokenImage} alt="" className="w-5 h-5 rounded-full" />
                      )}
                      <div>
                        <div className="font-semibold text-sm">{play.coinName}</div>
                        {play.tokenSymbol && (
                          <div className="text-[10px] text-muted-foreground">{play.tokenSymbol}</div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">{getMissReasonLabel(play.missReason)}</TableCell>
                  <TableCell className="text-xs">
                    {strat ? (
                      <span className="flex items-center gap-1">
                        <span>{strat.icon}</span>
                        <span className="truncate max-w-[80px]">{strat.name}</span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground">&mdash;</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums text-xs">
                    {play.potentialMultiplier
                      ? <span className={play.potentialMultiplier >= 1 ? 'text-emerald-600' : 'text-red-600'}>
                          {play.potentialMultiplier.toFixed(1)}x
                        </span>
                      : <span className="text-muted-foreground">&mdash;</span>
                    }
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums text-xs">
                    {play.potentialPnL != null
                      ? <span className={play.potentialPnL >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                          {play.potentialPnL >= 0 ? '+' : ''}{formatValue(play.potentialPnL)}
                        </span>
                      : <span className="text-muted-foreground">&mdash;</span>
                    }
                  </TableCell>
                  <TableCell className="text-xs">
                    {play.outcome ? (
                      <span className={`capitalize ${
                        play.outcome === 'win' ? 'text-emerald-600' :
                        play.outcome === 'loss' ? 'text-red-600' :
                        'text-muted-foreground'
                      }`}>
                        {play.outcome}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">&mdash;</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(play.createdAt).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric',
                    })}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-destructive hover:text-destructive h-7"
                      onClick={() => setDeleteId(play.id)}
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this entry?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && executeDelete(deleteId)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

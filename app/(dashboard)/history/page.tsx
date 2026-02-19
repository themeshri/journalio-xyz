'use client'

import { useState, useEffect } from 'react'
import { useWallet } from '@/lib/wallet-context'
import { TradesTable } from '@/components/TradesTable'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { TableRowsSkeleton } from '@/components/skeletons'

// --- Pre-Session types (read-only, matches pre-session page) ---

interface PreSessionSummary {
  date: string
  savedAt: string
  energyLevel: number
  emotionalState: string
  marketSentiment: string
}

interface PreSessionFull extends PreSessionSummary {
  sessionIntent: string
  maxTrades: string
  maxLoss: string
  solTrend: string
  time: string
  timeLimit: string
  defaultPositionSize: string
  hasOpenPositions: boolean | null
  majorNews: boolean | null
  majorNewsNote: string
  normalVolume: boolean | null
  rulesChecked: string[]
}

// --- Journal types (read-only, matches JournalModal) ---

interface JournalEntry {
  wallet: string
  tokenMint: string
  tradeNumber: number
  strategy: string
  emotionalState: string
  buyNotes: string
  buyRating: number
  exitPlan: string
  sellRating: number
  followedExitRule: boolean | null
  sellMistakes: string[]
  sellNotes: string
  attachment: string
}

// --- Data loaders ---

function loadPreSessions(): PreSessionFull[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem('journalio_pre_sessions')
    const index: PreSessionSummary[] = raw ? JSON.parse(raw) : []

    return index
      .map((s) => {
        try {
          const full = JSON.parse(
            localStorage.getItem(`journalio_pre_session_${s.date}`) || '{}'
          )
          return {
            ...s,
            sessionIntent: full.sessionIntent || '',
            maxTrades: full.maxTrades || '',
            maxLoss: full.maxLoss || '',
            solTrend: full.solTrend || '',
            time: full.time || '',
            timeLimit: full.timeLimit || '',
            defaultPositionSize: full.defaultPositionSize || '',
            hasOpenPositions: full.hasOpenPositions ?? null,
            majorNews: full.majorNews ?? null,
            majorNewsNote: full.majorNewsNote || '',
            normalVolume: full.normalVolume ?? null,
            rulesChecked: full.rulesChecked || [],
          } as PreSessionFull
        } catch {
          return null
        }
      })
      .filter(Boolean) as PreSessionFull[]
  } catch {
    return []
  }
}

function loadJournalEntries(): JournalEntry[] {
  if (typeof window === 'undefined') return []
  const entries: JournalEntry[] = []
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key?.startsWith('journalio_journal_')) continue
      const data = JSON.parse(localStorage.getItem(key) || '{}')
      const parts = key.replace('journalio_journal_', '').split('_')
      const tradeNumber = parseInt(parts.pop() || '0')
      const tokenMint = parts.pop() || ''
      const wallet = parts.join('_')
      entries.push({
        wallet,
        tokenMint,
        tradeNumber,
        strategy: data.strategy || data.buyCategory || '',
        emotionalState: data.emotionalState || '',
        buyNotes: data.buyNotes || '',
        buyRating: data.buyRating || 0,
        exitPlan: data.exitPlan || '',
        sellRating: data.sellRating || 0,
        followedExitRule: data.followedExitRule ?? null,
        sellMistakes: data.sellMistakes || [],
        sellNotes: data.sellNotes || '',
        attachment: data.attachment || '',
      })
    }
  } catch {
    /* ignore */
  }
  return entries
}

// --- Helpers ---

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

function formatTime(time: string): string {
  if (!time) return '-'
  try {
    const [h, m] = time.split(':').map(Number)
    const ampm = h >= 12 ? 'PM' : 'AM'
    const hour = h % 12 || 12
    return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`
  } catch {
    return time
  }
}

function truncateAddress(addr: string) {
  if (addr.length <= 10) return addr
  return `${addr.slice(0, 4)}...${addr.slice(-4)}`
}

function truncateText(text: string, max: number) {
  if (text.length <= max) return text
  return text.slice(0, max) + '...'
}

function energyColor(level: number): string {
  if (level >= 8) return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
  if (level >= 5) return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30'
  if (level >= 3) return 'bg-orange-500/10 text-orange-600 border-orange-500/30'
  if (level >= 1) return 'bg-red-500/10 text-red-600 border-red-500/30'
  return 'bg-muted text-muted-foreground'
}

function sentimentColor(sentiment: string): string {
  switch (sentiment) {
    case 'bullish':
      return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
    case 'bearish':
      return 'bg-red-500/10 text-red-600 border-red-500/30'
    default:
      return 'bg-zinc-500/10 text-zinc-600 border-zinc-500/30'
  }
}

function solTrendColor(trend: string): string {
  switch (trend) {
    case 'up':
      return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
    case 'down':
      return 'bg-red-500/10 text-red-600 border-red-500/30'
    default:
      return 'bg-zinc-500/10 text-zinc-600 border-zinc-500/30'
  }
}

function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '-'
}

function emotionalStateColor(state: string): string {
  switch (state) {
    case 'Confident':
      return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
    case 'Anxious':
      return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30'
    case 'FOMO':
      return 'bg-orange-500/10 text-orange-600 border-orange-500/30'
    case 'Revenge':
      return 'bg-red-500/10 text-red-600 border-red-500/30'
    case 'Neutral':
      return 'bg-zinc-500/10 text-zinc-600 border-zinc-500/30'
    default:
      return 'bg-zinc-500/10 text-zinc-600 border-zinc-500/30'
  }
}

function boolLabel(val: boolean | null): string {
  if (val === true) return 'Yes'
  if (val === false) return 'No'
  return '-'
}

// --- Detail field helper ---

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between items-start gap-4 py-1.5">
      <span className="text-sm text-muted-foreground shrink-0">{label}</span>
      <span className="text-sm text-right">{children}</span>
    </div>
  )
}

// --- Pre-Session Detail Dialog ---

function PreSessionDetailDialog({
  session,
  onClose,
}: {
  session: PreSessionFull | null
  onClose: () => void
}) {
  if (!session) return null

  return (
    <Dialog open={!!session} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Pre-Session — {formatDate(session.date)}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Date & Time */}
          <DetailRow label="Time">{formatTime(session.time)}</DetailRow>

          <Separator />

          {/* Energy & Mindset */}
          <div>
            <h4 className="text-sm font-medium mb-2">Energy & Mindset</h4>
            <DetailRow label="Energy Level">
              <span
                className={`inline-flex items-center justify-center w-7 h-7 rounded-md text-xs font-semibold border ${energyColor(
                  session.energyLevel
                )}`}
              >
                {session.energyLevel}
              </span>
            </DetailRow>
            <DetailRow label="Emotional State">{session.emotionalState || '-'}</DetailRow>
          </div>

          <Separator />

          {/* Session Intent */}
          <div>
            <h4 className="text-sm font-medium mb-2">Session Intent</h4>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {session.sessionIntent || '-'}
            </p>
          </div>

          <Separator />

          {/* Limits */}
          <div>
            <h4 className="text-sm font-medium mb-2">Limits</h4>
            <DetailRow label="Max Trades">{session.maxTrades || '-'}</DetailRow>
            <DetailRow label="Max Loss">{session.maxLoss || '-'}</DetailRow>
            <DetailRow label="Time Limit">{session.timeLimit || '-'}</DetailRow>
            <DetailRow label="Position Size">{session.defaultPositionSize || '-'}</DetailRow>
            <DetailRow label="Open Positions">{boolLabel(session.hasOpenPositions)}</DetailRow>
          </div>

          <Separator />

          {/* Market Context */}
          <div>
            <h4 className="text-sm font-medium mb-2">Market Context</h4>
            <DetailRow label="Sentiment">
              {session.marketSentiment ? (
                <span
                  className={`inline-block px-2 py-0.5 rounded-md text-xs font-medium border ${sentimentColor(
                    session.marketSentiment
                  )}`}
                >
                  {capitalize(session.marketSentiment)}
                </span>
              ) : (
                '-'
              )}
            </DetailRow>
            <DetailRow label="SOL Trend">
              {session.solTrend ? (
                <span
                  className={`inline-block px-2 py-0.5 rounded-md text-xs font-medium border ${solTrendColor(
                    session.solTrend
                  )}`}
                >
                  {capitalize(session.solTrend)}
                </span>
              ) : (
                '-'
              )}
            </DetailRow>
            <DetailRow label="Major News">{boolLabel(session.majorNews)}</DetailRow>
            {session.majorNews && session.majorNewsNote && (
              <DetailRow label="News Note">{session.majorNewsNote}</DetailRow>
            )}
            <DetailRow label="Normal Volume">{boolLabel(session.normalVolume)}</DetailRow>
          </div>

          {/* Rules Checked */}
          {session.rulesChecked && session.rulesChecked.length > 0 && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-medium mb-2">Rules Checked</h4>
                <p className="text-sm text-muted-foreground">
                  {session.rulesChecked.length} rule{session.rulesChecked.length !== 1 ? 's' : ''} confirmed
                </p>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// --- Journal Detail Dialog ---

function JournalDetailDialog({
  entry,
  onClose,
}: {
  entry: JournalEntry | null
  onClose: () => void
}) {
  if (!entry) return null

  return (
    <Dialog open={!!entry} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Journal — {truncateAddress(entry.tokenMint)} #{entry.tradeNumber}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Buy Analysis */}
          <div>
            <h4 className="text-sm font-medium mb-2">Buy Analysis</h4>
            <DetailRow label="Strategy">{entry.strategy || '-'}</DetailRow>
            <DetailRow label="Emotional State">
              {entry.emotionalState ? (
                <span
                  className={`inline-block px-2 py-0.5 rounded-md text-xs font-medium border ${emotionalStateColor(
                    entry.emotionalState
                  )}`}
                >
                  {entry.emotionalState}
                </span>
              ) : (
                '-'
              )}
            </DetailRow>
            {entry.buyNotes && (
              <div className="py-1.5">
                <span className="text-sm text-muted-foreground block mb-1">Notes</span>
                <p className="text-sm whitespace-pre-wrap">{entry.buyNotes}</p>
              </div>
            )}
            <DetailRow label="Entry Rating">
              {entry.buyRating > 0 ? (
                <span className="font-mono tabular-nums font-medium">{entry.buyRating}/10</span>
              ) : (
                '-'
              )}
            </DetailRow>
            {entry.exitPlan && (
              <div className="py-1.5">
                <span className="text-sm text-muted-foreground block mb-1">Exit Plan</span>
                <p className="text-sm whitespace-pre-wrap">{entry.exitPlan}</p>
              </div>
            )}
          </div>

          <Separator />

          {/* Sell Analysis */}
          <div>
            <h4 className="text-sm font-medium mb-2">Sell Analysis</h4>
            <DetailRow label="Exit Rating">
              {entry.sellRating > 0 ? (
                <span className="font-mono tabular-nums font-medium">{entry.sellRating}/10</span>
              ) : (
                '-'
              )}
            </DetailRow>
            <DetailRow label="Followed Exit Rule">
              {entry.followedExitRule === true ? (
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                  Yes
                </Badge>
              ) : entry.followedExitRule === false ? (
                <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30">
                  No
                </Badge>
              ) : (
                '-'
              )}
            </DetailRow>
            {entry.sellMistakes.length > 0 && (
              <div className="py-1.5">
                <span className="text-sm text-muted-foreground block mb-1">Mistakes</span>
                <ul className="text-sm list-disc list-inside space-y-0.5">
                  {entry.sellMistakes.map((m, i) => (
                    <li key={i}>{m}</li>
                  ))}
                </ul>
              </div>
            )}
            {entry.sellNotes && (
              <div className="py-1.5">
                <span className="text-sm text-muted-foreground block mb-1">Notes</span>
                <p className="text-sm whitespace-pre-wrap">{entry.sellNotes}</p>
              </div>
            )}
          </div>

          {/* Attachment */}
          {entry.attachment && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-medium mb-2">Attachment</h4>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={entry.attachment}
                  alt="Trade attachment"
                  className="rounded-md max-w-full max-h-64 object-contain"
                />
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// --- Sub-tab components ---

function PreSessionsTab() {
  const [sessions, setSessions] = useState<PreSessionFull[]>([])
  const [loaded, setLoaded] = useState(false)
  const [selectedSession, setSelectedSession] = useState<PreSessionFull | null>(null)

  useEffect(() => {
    setSessions(loadPreSessions().sort((a, b) => b.date.localeCompare(a.date)))
    setLoaded(true)
  }, [])

  if (!loaded) {
    return <div className="py-4"><TableRowsSkeleton rows={3} cols={9} /></div>
  }

  if (sessions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        No pre-session entries yet. Complete your first pre-session to see
        history here.
      </p>
    )
  }

  return (
    <>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[100px]">Date</TableHead>
              <TableHead className="min-w-[70px]">Time</TableHead>
              <TableHead className="text-center min-w-[60px]">Energy</TableHead>
              <TableHead className="min-w-[100px]">Emotional State</TableHead>
              <TableHead className="text-center min-w-[80px]">Sentiment</TableHead>
              <TableHead className="text-center min-w-[80px]">SOL Trend</TableHead>
              <TableHead className="text-center min-w-[70px]">Max Trades</TableHead>
              <TableHead className="min-w-[70px]">Max Loss</TableHead>
              <TableHead className="min-w-[150px]">Session Intent</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions.map((s) => (
              <TableRow
                key={s.date}
                className="cursor-pointer"
                onClick={() => setSelectedSession(s)}
              >
                <TableCell className="text-sm font-mono tabular-nums">
                  {formatDate(s.date)}
                </TableCell>
                <TableCell className="text-sm font-mono tabular-nums text-muted-foreground">
                  {formatTime(s.time)}
                </TableCell>
                <TableCell className="text-center">
                  <span
                    className={`inline-flex items-center justify-center w-7 h-7 rounded-md text-xs font-semibold border ${energyColor(
                      s.energyLevel
                    )}`}
                  >
                    {s.energyLevel}
                  </span>
                </TableCell>
                <TableCell className="text-sm">
                  {s.emotionalState || '-'}
                </TableCell>
                <TableCell className="text-center">
                  {s.marketSentiment ? (
                    <span
                      className={`inline-block px-2 py-0.5 rounded-md text-xs font-medium border ${sentimentColor(
                        s.marketSentiment
                      )}`}
                    >
                      {capitalize(s.marketSentiment)}
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-xs">-</span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  {s.solTrend ? (
                    <span
                      className={`inline-block px-2 py-0.5 rounded-md text-xs font-medium border ${solTrendColor(
                        s.solTrend
                      )}`}
                    >
                      {capitalize(s.solTrend)}
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-xs">-</span>
                  )}
                </TableCell>
                <TableCell className="text-center font-mono tabular-nums text-sm">
                  {s.maxTrades || '-'}
                </TableCell>
                <TableCell className="text-sm font-mono tabular-nums">
                  {s.maxLoss || '-'}
                </TableCell>
                <TableCell
                  className="text-sm text-muted-foreground max-w-[200px]"
                  title={s.sessionIntent}
                >
                  {s.sessionIntent ? truncateText(s.sessionIntent, 50) : '-'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <PreSessionDetailDialog
        session={selectedSession}
        onClose={() => setSelectedSession(null)}
      />
    </>
  )
}

function JournalHistoryTab() {
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [loaded, setLoaded] = useState(false)
  const [selectedJournal, setSelectedJournal] = useState<JournalEntry | null>(null)

  useEffect(() => {
    setEntries(loadJournalEntries().reverse())
    setLoaded(true)
  }, [])

  if (!loaded) {
    return <div className="py-4"><TableRowsSkeleton rows={3} cols={9} /></div>
  }

  if (entries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        No journal entries yet. Add journal notes from the Trade Journal page.
      </p>
    )
  }

  return (
    <>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[100px]">Token</TableHead>
              <TableHead className="text-center min-w-[60px]">Trade #</TableHead>
              <TableHead className="min-w-[110px]">Strategy</TableHead>
              <TableHead className="min-w-[100px]">Emotional State</TableHead>
              <TableHead className="text-center min-w-[70px]">Buy Rating</TableHead>
              <TableHead className="min-w-[140px]">Exit Plan</TableHead>
              <TableHead className="text-center min-w-[70px]">Sell Rating</TableHead>
              <TableHead className="text-center min-w-[90px]">Followed Exit</TableHead>
              <TableHead className="min-w-[120px]">Sell Mistakes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((e, i) => (
              <TableRow
                key={`${e.tokenMint}-${e.tradeNumber}-${i}`}
                className="cursor-pointer"
                onClick={() => setSelectedJournal(e)}
              >
                <TableCell className="font-mono text-sm">
                  {truncateAddress(e.tokenMint)}
                </TableCell>
                <TableCell className="text-center font-mono tabular-nums text-sm">
                  {e.tradeNumber}
                </TableCell>
                <TableCell className="text-sm">
                  {e.strategy || '-'}
                </TableCell>
                <TableCell className="text-sm">
                  {e.emotionalState ? (
                    <span
                      className={`inline-block px-2 py-0.5 rounded-md text-xs font-medium border ${emotionalStateColor(
                        e.emotionalState
                      )}`}
                    >
                      {e.emotionalState}
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-xs">-</span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  {e.buyRating > 0 ? (
                    <span className="font-mono tabular-nums text-sm font-medium">
                      {e.buyRating}/10
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-xs">-</span>
                  )}
                </TableCell>
                <TableCell
                  className="text-sm text-muted-foreground max-w-[180px]"
                  title={e.exitPlan}
                >
                  {e.exitPlan ? truncateText(e.exitPlan, 40) : '-'}
                </TableCell>
                <TableCell className="text-center">
                  {e.sellRating > 0 ? (
                    <span className="font-mono tabular-nums text-sm font-medium">
                      {e.sellRating}/10
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-xs">-</span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  {e.followedExitRule === true ? (
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                      Yes
                    </Badge>
                  ) : e.followedExitRule === false ? (
                    <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30">
                      No
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground text-xs">-</span>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {e.sellMistakes.length > 0
                    ? truncateText(e.sellMistakes.join(', '), 40)
                    : '-'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <JournalDetailDialog
        entry={selectedJournal}
        onClose={() => setSelectedJournal(null)}
      />
    </>
  )
}

// --- Main page ---

export default function HistoryPage() {
  const { currentWallet, currentChain, currentDex, trades, isLoading, error, searchWallet, cacheInfo } =
    useWallet()

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">History</h1>
      </div>

      <Tabs defaultValue="pre-sessions">
        <TabsList>
          <TabsTrigger value="pre-sessions">Pre-Sessions</TabsTrigger>
          <TabsTrigger value="journal">Journal</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
        </TabsList>

        <TabsContent value="pre-sessions">
          <PreSessionsTab />
        </TabsContent>

        <TabsContent value="journal">
          <JournalHistoryTab />
        </TabsContent>

        <TabsContent value="transactions">
          {!currentWallet ? (
            <p className="text-sm text-muted-foreground py-4">
              Enter a wallet address in the sidebar to view trade history.
            </p>
          ) : isLoading ? (
            <div className="py-4">
              <TableRowsSkeleton rows={5} cols={6} />
            </div>
          ) : error ? (
            <p className="text-sm text-destructive py-4">{error}</p>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-4 mt-4">
                <span className="text-sm text-muted-foreground">
                  {trades.length} transactions
                </span>
                <div className="flex items-center gap-3">
                  {cacheInfo?.cached && cacheInfo.cachedAt && (
                    <span className="text-xs text-muted-foreground">
                      Cached {cacheInfo.cachedAt.toLocaleTimeString()}
                    </span>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => searchWallet(currentWallet, currentChain, true, currentDex)}
                    disabled={isLoading}
                  >
                    Refresh
                  </Button>
                </div>
              </div>

              {trades.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No transactions found for this wallet.
                </p>
              ) : (
                <TradesTable trades={trades} />
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

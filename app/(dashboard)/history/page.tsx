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
}

// --- Journal types (read-only, matches JournalModal) ---

interface JournalEntry {
  wallet: string
  tokenMint: string
  tradeNumber: number
  buyCategory: string
  buyRating: number
  fomoLevel: number
  exitPlan: string
  sellRating: number
  followedExitRule: boolean | null
  sellMistakes: string[]
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
        buyCategory: data.buyCategory || '',
        buyRating: data.buyRating || 0,
        fomoLevel: data.fomoLevel || 0,
        exitPlan: data.exitPlan || '',
        sellRating: data.sellRating || 0,
        followedExitRule: data.followedExitRule ?? null,
        sellMistakes: data.sellMistakes || [],
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

// --- Sub-tab components ---

function PreSessionsTab() {
  const [sessions, setSessions] = useState<PreSessionFull[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    setSessions(loadPreSessions().sort((a, b) => b.date.localeCompare(a.date)))
    setLoaded(true)
  }, [])

  if (!loaded) {
    return <p className="text-sm text-muted-foreground py-4">Loading...</p>
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
            <TableRow key={s.date}>
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
  )
}

function JournalHistoryTab() {
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    setEntries(loadJournalEntries().reverse())
    setLoaded(true)
  }, [])

  if (!loaded) {
    return <p className="text-sm text-muted-foreground py-4">Loading...</p>
  }

  if (entries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        No journal entries yet. Add journal notes from the Trade Journal page.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[100px]">Token</TableHead>
            <TableHead className="text-center min-w-[60px]">Trade #</TableHead>
            <TableHead className="min-w-[110px]">Buy Category</TableHead>
            <TableHead className="text-center min-w-[70px]">Buy Rating</TableHead>
            <TableHead className="text-center min-w-[70px]">FOMO</TableHead>
            <TableHead className="min-w-[140px]">Exit Plan</TableHead>
            <TableHead className="text-center min-w-[70px]">Sell Rating</TableHead>
            <TableHead className="text-center min-w-[90px]">Followed Exit</TableHead>
            <TableHead className="min-w-[120px]">Sell Mistakes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((e, i) => (
            <TableRow key={`${e.tokenMint}-${e.tradeNumber}-${i}`}>
              <TableCell className="font-mono text-sm">
                {truncateAddress(e.tokenMint)}
              </TableCell>
              <TableCell className="text-center font-mono tabular-nums text-sm">
                {e.tradeNumber}
              </TableCell>
              <TableCell className="text-sm">
                {e.buyCategory || '-'}
              </TableCell>
              <TableCell className="text-center">
                {e.buyRating > 0 ? (
                  <span className="font-mono tabular-nums text-sm font-medium">
                    {e.buyRating}/5
                  </span>
                ) : (
                  <span className="text-muted-foreground text-xs">-</span>
                )}
              </TableCell>
              <TableCell className="text-center">
                {e.fomoLevel > 0 ? (
                  <span
                    className={`inline-flex items-center justify-center w-7 h-7 rounded-md text-xs font-semibold border ${
                      e.fomoLevel >= 7
                        ? 'bg-red-500/10 text-red-600 border-red-500/30'
                        : e.fomoLevel >= 4
                        ? 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30'
                        : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                    }`}
                  >
                    {e.fomoLevel}
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
                    {e.sellRating}/5
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
  )
}

// --- Main page ---

export default function HistoryPage() {
  const { currentWallet, trades, isLoading, error, searchWallet, cacheInfo } =
    useWallet()

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">History</h1>
      </div>

      <Tabs defaultValue="transactions">
        <TabsList>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="pre-sessions">Pre-Sessions</TabsTrigger>
          <TabsTrigger value="journal">Journal</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions">
          {!currentWallet ? (
            <p className="text-sm text-muted-foreground py-4">
              Enter a wallet address in the sidebar to view trade history.
            </p>
          ) : isLoading ? (
            <p className="text-sm text-muted-foreground py-4">
              Loading trades...
            </p>
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
                    onClick={() => searchWallet(currentWallet, true)}
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

        <TabsContent value="pre-sessions">
          <PreSessionsTab />
        </TabsContent>

        <TabsContent value="journal">
          <JournalHistoryTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

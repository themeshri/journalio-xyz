'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useWallet } from '@/lib/wallet-context'
import { TradesTable } from '@/components/TradesTable'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card } from '@/components/ui/card'
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

import { loadPreSessions, type PreSessionData } from '@/lib/pre-sessions'
import { loadPostSessions, type PostSessionData } from '@/lib/post-sessions'
import { loadJournals, type JournalRecord } from '@/lib/journals'
import { formatValue } from '@/lib/formatters'

// Use PreSessionData as PreSessionFull (API returns all fields)
type PreSessionFull = PreSessionData

// JournalEntry type for history display
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

function journalRecordToEntry(j: JournalRecord): JournalEntry {
  return {
    wallet: j.walletAddress,
    tokenMint: j.tokenMint,
    tradeNumber: j.tradeNumber,
    strategy: j.strategy || '',
    emotionalState: j.emotionalState || '',
    buyNotes: j.buyNotes || '',
    buyRating: j.buyRating || 0,
    exitPlan: j.exitPlan || '',
    sellRating: j.sellRating || 0,
    followedExitRule: j.followedExitRule ?? null,
    sellMistakes: j.sellMistakes || [],
    sellNotes: j.sellNotes || '',
    attachment: j.attachment || '',
  }
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
  if (level >= 8) return 'bg-amber-500/10 text-amber-600 border-amber-500/30'
  if (level >= 5) return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30'
  if (level >= 3) return 'bg-orange-500/10 text-orange-600 border-orange-500/30'
  if (level >= 1) return 'bg-red-500/10 text-red-600 border-red-500/30'
  return 'bg-muted text-muted-foreground'
}

function sentimentColor(sentiment: string): string {
  switch (sentiment) {
    case 'bullish':
      return 'bg-amber-500/10 text-amber-600 border-amber-500/30'
    case 'bearish':
      return 'bg-red-500/10 text-red-600 border-red-500/30'
    default:
      return 'bg-zinc-500/10 text-zinc-600 border-zinc-500/30'
  }
}

function solTrendColor(trend: string): string {
  switch (trend) {
    case 'up':
      return 'bg-amber-500/10 text-amber-600 border-amber-500/30'
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
      return 'bg-amber-500/10 text-amber-600 border-amber-500/30'
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
                <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">
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

// --- Post-Session Detail Dialog ---

function PostSessionDetailDialog({
  session,
  onClose,
}: {
  session: PostSessionData | null
  onClose: () => void
}) {
  if (!session) return null

  return (
    <Dialog open={!!session} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Post-Session — {formatDate(session.date)}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <DetailRow label="Rating">
            {session.rating > 0 ? (
              <span className="font-mono tabular-nums font-medium">{session.rating}/10</span>
            ) : (
              '-'
            )}
          </DetailRow>

          <Separator />

          <DetailRow label="Emotional State">{session.emotionalState || '-'}</DetailRow>

          <Separator />

          {session.whatWentWell && (
            <div>
              <h4 className="text-sm font-medium mb-2">What Went Well</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{session.whatWentWell}</p>
            </div>
          )}

          {session.whatWentWrong && (
            <div>
              <h4 className="text-sm font-medium mb-2">What Went Wrong</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{session.whatWentWrong}</p>
            </div>
          )}

          {session.keyLessons && (
            <div>
              <h4 className="text-sm font-medium mb-2">Key Lessons</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{session.keyLessons}</p>
            </div>
          )}

          <Separator />

          <DetailRow label="Rules Followed">
            {session.rulesFollowed === true ? (
              <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">Yes</Badge>
            ) : session.rulesFollowed === false ? (
              <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30">No</Badge>
            ) : (
              '-'
            )}
          </DetailRow>
          {session.rulesNotes && (
            <div>
              <h4 className="text-sm font-medium mb-2">Rules Notes</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{session.rulesNotes}</p>
            </div>
          )}

          {session.planForTomorrow && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-medium mb-2">Plan for Tomorrow</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{session.planForTomorrow}</p>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// --- Sub-tab components ---

type SessionRow = {
  date: string
  type: 'pre' | 'post'
  preSession?: PreSessionFull
  postSession?: PostSessionData
}

function SessionsTab() {
  const [preSessions, setPreSessions] = useState<PreSessionFull[]>([])
  const [postSessions, setPostSessions] = useState<PostSessionData[]>([])
  const [loaded, setLoaded] = useState(false)
  const [selectedPreSession, setSelectedPreSession] = useState<PreSessionFull | null>(null)
  const [selectedPostSession, setSelectedPostSession] = useState<PostSessionData | null>(null)

  useEffect(() => {
    Promise.all([loadPreSessions(), loadPostSessions()]).then(([pre, post]) => {
      setPreSessions(pre.sort((a, b) => b.date.localeCompare(a.date)))
      setPostSessions(post.sort((a, b) => b.date.localeCompare(a.date)))
      setLoaded(true)
    })
  }, [])

  const rows = useMemo(() => {
    const result: SessionRow[] = []
    const preByDate = new Map(preSessions.map(s => [s.date, s]))
    const postByDate = new Map(postSessions.map(s => [s.date, s]))
    const allDates = new Set([...preByDate.keys(), ...postByDate.keys()])
    const sorted = Array.from(allDates).sort((a, b) => b.localeCompare(a))

    for (const date of sorted) {
      const pre = preByDate.get(date)
      const post = postByDate.get(date)
      if (pre) result.push({ date, type: 'pre', preSession: pre })
      if (post) result.push({ date, type: 'post', postSession: post })
    }
    return result
  }, [preSessions, postSessions])

  if (!loaded) {
    return <div className="py-4"><TableRowsSkeleton rows={3} cols={7} /></div>
  }

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        No session entries yet. Complete your first pre-session or post-session to see
        history here.
      </p>
    )
  }

  return (
    <>
      <div className="flex items-center gap-3 mt-4 mb-4 text-sm text-muted-foreground">
        <span>{preSessions.length} pre-session{preSessions.length !== 1 ? 's' : ''}</span>
        <span>&middot;</span>
        <span>{postSessions.length} post-session{postSessions.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[100px]">Date</TableHead>
              <TableHead className="min-w-[80px]">Type</TableHead>
              <TableHead className="min-w-[100px]">Emotional State</TableHead>
              <TableHead className="text-center min-w-[60px]">Energy / Rating</TableHead>
              <TableHead className="text-center min-w-[80px]">Sentiment / Rules</TableHead>
              <TableHead className="min-w-[200px]">Summary</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, i) => {
              if (row.type === 'pre' && row.preSession) {
                const s = row.preSession
                return (
                  <TableRow
                    key={`pre-${s.date}-${i}`}
                    className="cursor-pointer"
                    onClick={() => setSelectedPreSession(s)}
                  >
                    <TableCell className="text-sm font-mono tabular-nums">
                      {formatDate(s.date)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30 text-xs">
                        Pre
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {s.emotionalState || '-'}
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
                    <TableCell
                      className="text-sm text-muted-foreground max-w-[250px]"
                      title={s.sessionIntent}
                    >
                      {s.sessionIntent ? truncateText(s.sessionIntent, 60) : '-'}
                    </TableCell>
                  </TableRow>
                )
              }

              if (row.type === 'post' && row.postSession) {
                const s = row.postSession
                return (
                  <TableRow
                    key={`post-${s.date}-${i}`}
                    className="cursor-pointer"
                    onClick={() => setSelectedPostSession(s)}
                  >
                    <TableCell className="text-sm font-mono tabular-nums">
                      {formatDate(s.date)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/30 text-xs">
                        Post
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {s.emotionalState || '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      {s.rating > 0 ? (
                        <span className="font-mono tabular-nums text-sm font-medium">{s.rating}/10</span>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {s.rulesFollowed === true ? (
                        <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-xs">
                          Rules ✓
                        </Badge>
                      ) : s.rulesFollowed === false ? (
                        <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30 text-xs">
                          Rules ✗
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell
                      className="text-sm text-muted-foreground max-w-[250px]"
                      title={s.whatWentWell}
                    >
                      {s.whatWentWell ? truncateText(s.whatWentWell, 60) : s.keyLessons ? truncateText(s.keyLessons, 60) : '-'}
                    </TableCell>
                  </TableRow>
                )
              }

              return null
            })}
          </TableBody>
        </Table>
      </div>

      <PreSessionDetailDialog
        session={selectedPreSession}
        onClose={() => setSelectedPreSession(null)}
      />
      <PostSessionDetailDialog
        session={selectedPostSession}
        onClose={() => setSelectedPostSession(null)}
      />
    </>
  )
}

function JournalHistoryTab() {
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [loaded, setLoaded] = useState(false)
  const [selectedJournal, setSelectedJournal] = useState<JournalEntry | null>(null)

  useEffect(() => {
    loadJournals().then((records) => {
      setEntries(records.map(journalRecordToEntry))
      setLoaded(true)
    })
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
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">
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

// --- Missed Trades types & helpers ---

interface PaperedPlay {
  id: string
  coinName: string
  tokenMint: string | null
  tokenSymbol: string | null
  tokenImage: string | null
  missReason: string | null
  strategyId: string | null
  outcome: string | null
  entryPrice: number | null
  exitPrice: number | null
  hypotheticalPositionSize: number | null
  potentialMultiplier: number | null
  potentialPnL: number | null
  peakMultiplier: number | null
  notes: string
  attachment: string | null
  createdAt: string
}

const MISS_REASONS: { id: string; emoji: string; label: string }[] = [
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

function outcomeColor(outcome: string | null): string {
  switch (outcome) {
    case 'win': return 'bg-amber-500/10 text-amber-600 border-amber-500/30'
    case 'loss': return 'bg-red-500/10 text-red-600 border-red-500/30'
    case 'breakeven': return 'bg-zinc-500/10 text-zinc-600 border-zinc-500/30'
    default: return 'bg-zinc-500/10 text-muted-foreground border-zinc-500/30'
  }
}

function formatTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return iso
  }
}

// --- Missed Trade Detail Dialog ---

function MissedTradeDetailDialog({
  play,
  onClose,
}: {
  play: PaperedPlay | null
  onClose: () => void
}) {
  if (!play) return null

  return (
    <Dialog open={!!play} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {play.tokenImage && (
              <img src={play.tokenImage} alt={play.coinName} className="w-5 h-5 rounded-full" />
            )}
            {play.coinName}
            {play.tokenSymbol && (
              <span className="text-sm text-muted-foreground font-normal">{play.tokenSymbol}</span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <DetailRow label="Date">{formatTimestamp(play.createdAt)}</DetailRow>
          <DetailRow label="Reason Missed">{getMissReasonLabel(play.missReason)}</DetailRow>
          <DetailRow label="Outcome">
            {play.outcome ? (
              <span className={`inline-block px-2 py-0.5 rounded-md text-xs font-medium border ${outcomeColor(play.outcome)}`}>
                {capitalize(play.outcome)}
              </span>
            ) : (
              <span className="text-muted-foreground">Pending</span>
            )}
          </DetailRow>

          <Separator />

          {(play.entryPrice != null || play.exitPrice != null) && (
            <>
              <div>
                <h4 className="text-sm font-medium mb-2">Prices</h4>
                {play.entryPrice != null && <DetailRow label="Entry Price">${play.entryPrice.toFixed(6)}</DetailRow>}
                {play.exitPrice != null && <DetailRow label="Exit Price">${play.exitPrice.toFixed(6)}</DetailRow>}
              </div>
              <Separator />
            </>
          )}

          <div>
            <h4 className="text-sm font-medium mb-2">Hypothetical</h4>
            {play.hypotheticalPositionSize != null && (
              <DetailRow label="Position Size">{formatValue(play.hypotheticalPositionSize)}</DetailRow>
            )}
            {play.potentialMultiplier != null && (
              <DetailRow label="Multiplier">
                <span className={`font-mono tabular-nums font-medium ${play.potentialMultiplier >= 1 ? 'text-lime-500' : 'text-red-500'}`}>
                  {play.potentialMultiplier.toFixed(2)}x
                </span>
              </DetailRow>
            )}
            {play.peakMultiplier != null && (
              <DetailRow label="Peak Multiplier">
                <span className="font-mono tabular-nums font-medium text-lime-500">
                  {play.peakMultiplier.toFixed(2)}x
                </span>
              </DetailRow>
            )}
            {play.potentialPnL != null && (
              <DetailRow label="Potential P/L">
                <span className={`font-mono tabular-nums font-medium ${play.potentialPnL >= 0 ? 'text-lime-500' : 'text-red-500'}`}>
                  {play.potentialPnL >= 0 ? '+' : ''}{formatValue(play.potentialPnL)}
                </span>
              </DetailRow>
            )}
          </div>

          {play.notes && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-medium mb-2">Notes</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{play.notes}</p>
              </div>
            </>
          )}

          {play.attachment && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-medium mb-2">Attachment</h4>
                <img
                  src={play.attachment}
                  alt="Missed trade attachment"
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

// --- Missed Trades Tab ---

function MissedTradesTab() {
  const [plays, setPlays] = useState<PaperedPlay[]>([])
  const [loaded, setLoaded] = useState(false)
  const [selectedPlay, setSelectedPlay] = useState<PaperedPlay | null>(null)

  useEffect(() => {
    fetch('/api/papered-plays')
      .then((res) => res.json())
      .then((data) => {
        setPlays(Array.isArray(data) ? data : [])
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [])

  if (!loaded) {
    return <div className="py-4"><TableRowsSkeleton rows={3} cols={6} /></div>
  }

  if (plays.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        No missed trades recorded yet. Track missed opportunities from the Missed Trades page.
      </p>
    )
  }

  const winners = plays.filter((p) => p.outcome === 'win')
  const totalMissedPnL = plays.reduce((s, p) => s + (p.potentialPnL || 0), 0)

  return (
    <>
      <div className="flex items-center gap-3 mt-4 mb-4 text-sm text-muted-foreground">
        <span>{plays.length} missed trades</span>
        <span>&middot;</span>
        <span>{winners.length} would-be winners</span>
        {totalMissedPnL !== 0 && (
          <>
            <span>&middot;</span>
            <span className={totalMissedPnL >= 0 ? 'text-lime-500' : 'text-red-500'}>
              {totalMissedPnL >= 0 ? '+' : ''}{formatValue(totalMissedPnL)} missed
            </span>
          </>
        )}
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[120px]">Token</TableHead>
              <TableHead className="min-w-[100px]">Reason</TableHead>
              <TableHead className="text-center min-w-[80px]">Outcome</TableHead>
              <TableHead className="text-right min-w-[80px]">Multiplier</TableHead>
              <TableHead className="text-right min-w-[100px]">Potential P/L</TableHead>
              <TableHead className="min-w-[100px]">Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {plays.map((p) => (
              <TableRow
                key={p.id}
                className="cursor-pointer"
                onClick={() => setSelectedPlay(p)}
              >
                <TableCell className="text-sm">
                  <div className="flex items-center gap-2">
                    {p.tokenImage ? (
                      <img src={p.tokenImage} alt={p.coinName} className="w-5 h-5 rounded-full shrink-0" />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-zinc-700 flex items-center justify-center text-[8px] font-bold text-zinc-300 shrink-0">
                        {p.coinName.slice(0, 2)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-medium truncate">{p.coinName}</p>
                      {p.tokenSymbol && (
                        <p className="text-[10px] text-muted-foreground">{p.tokenSymbol}</p>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-sm">
                  {getMissReasonLabel(p.missReason)}
                </TableCell>
                <TableCell className="text-center">
                  {p.outcome ? (
                    <span className={`inline-block px-2 py-0.5 rounded-md text-xs font-medium border ${outcomeColor(p.outcome)}`}>
                      {capitalize(p.outcome)}
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-xs">Pending</span>
                  )}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums text-sm">
                  {p.potentialMultiplier != null ? (
                    <span className={p.potentialMultiplier >= 1 ? 'text-lime-500' : 'text-red-500'}>
                      {p.potentialMultiplier.toFixed(2)}x
                    </span>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums text-sm">
                  {p.potentialPnL != null ? (
                    <span className={p.potentialPnL >= 0 ? 'text-lime-500' : 'text-red-500'}>
                      {p.potentialPnL >= 0 ? '+' : ''}{formatValue(p.potentialPnL)}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="text-sm font-mono tabular-nums text-muted-foreground">
                  {formatTimestamp(p.createdAt)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <MissedTradeDetailDialog
        play={selectedPlay}
        onClose={() => setSelectedPlay(null)}
      />
    </>
  )
}

// --- Chartbook Tab ---

interface ChartbookImage {
  src: string
  tokenMint: string
  tradeNumber: number
  date: string
  pnl: number | null
  token: string
}

function ChartbookTab() {
  const [entries, setEntries] = useState<JournalRecord[]>([])
  const [loaded, setLoaded] = useState(false)
  const [selectedImage, setSelectedImage] = useState<ChartbookImage | null>(null)
  const { flattenedTrades } = useWallet()

  useEffect(() => {
    loadJournals().then((records) => {
      setEntries(records)
      setLoaded(true)
    })
  }, [])

  // Build a map of tokenMint -> trade cycle for P/L lookup
  const tradeMap = useMemo(() => {
    const map = new Map<string, { pnl: number; token: string }>()
    for (const t of flattenedTrades) {
      // key matches how journal entries reference trades
      const key = `${t.tokenMint}-${t.tradeNumber}`
      map.set(key, { pnl: t.profitLoss, token: t.token })
    }
    return map
  }, [flattenedTrades])

  const images = useMemo(() => {
    const result: ChartbookImage[] = []
    for (const entry of entries) {
      if (!entry.attachment) continue

      let imgs: string[] = []
      try {
        const parsed = JSON.parse(entry.attachment)
        if (Array.isArray(parsed)) {
          imgs = parsed
        } else {
          imgs = [entry.attachment]
        }
      } catch {
        // Not JSON — treat as single image
        if (entry.attachment.startsWith('data:')) {
          imgs = [entry.attachment]
        }
      }

      const tradeInfo = tradeMap.get(`${entry.tokenMint}-${entry.tradeNumber}`)

      for (const src of imgs) {
        result.push({
          src,
          tokenMint: entry.tokenMint,
          tradeNumber: entry.tradeNumber,
          date: entry.createdAt,
          pnl: tradeInfo?.pnl ?? null,
          token: tradeInfo?.token || truncateAddress(entry.tokenMint),
        })
      }
    }
    return result
  }, [entries, tradeMap])

  if (!loaded) {
    return <div className="py-4"><TableRowsSkeleton rows={2} cols={4} /></div>
  }

  if (images.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        No chart images yet. Upload screenshots when journaling trades.
      </p>
    )
  }

  return (
    <>
      <p className="text-sm text-muted-foreground mt-4 mb-4">
        {images.length} image{images.length !== 1 ? 's' : ''} from journal entries
      </p>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {images.map((img, i) => (
          <Card
            key={`${img.tokenMint}-${img.tradeNumber}-${i}`}
            className="overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
            onClick={() => setSelectedImage(img)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img.src}
              alt={`${img.token} chart`}
              className="w-full h-40 object-cover"
            />
            <div className="p-2 space-y-0.5">
              <p className="text-sm font-medium truncate">{img.token}</p>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground font-mono">
                  {formatTimestamp(img.date)}
                </span>
                {img.pnl !== null && (
                  <span className={`text-xs font-mono font-medium ${img.pnl >= 0 ? 'text-lime-500' : 'text-red-500'}`}>
                    {img.pnl >= 0 ? '+' : ''}{formatValue(img.pnl)}
                  </span>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Full-size image dialog */}
      {selectedImage && (
        <Dialog open={!!selectedImage} onOpenChange={(open) => !open && setSelectedImage(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selectedImage.token}
                <span className="text-sm text-muted-foreground font-normal">
                  #{selectedImage.tradeNumber}
                </span>
                {selectedImage.pnl !== null && (
                  <span className={`text-sm font-mono font-medium ${selectedImage.pnl >= 0 ? 'text-lime-500' : 'text-red-500'}`}>
                    {selectedImage.pnl >= 0 ? '+' : ''}{formatValue(selectedImage.pnl)}
                  </span>
                )}
              </DialogTitle>
            </DialogHeader>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selectedImage.src}
              alt={`${selectedImage.token} chart`}
              className="w-full rounded-md"
            />
            <p className="text-xs text-muted-foreground font-mono">
              {formatTimestamp(selectedImage.date)}
            </p>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}

// --- Main page ---

export default function HistoryPage() {
  const { allTrades, isAnyLoading, hasActiveWallets, refreshAll, initialized } = useWallet()
  const searchParams = useSearchParams()
  const router = useRouter()
  const activeTab = searchParams.get('tab') || 'sessions'

  function handleTabChange(value: string) {
    router.replace(`/history?tab=${value}`, { scroll: false })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">History</h1>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="bg-transparent p-0 h-auto gap-2 border-b border-border rounded-none w-full justify-start">
          <TabsTrigger value="sessions" className="rounded-none shadow-none bg-transparent px-3 py-2 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-foreground data-[state=active]:text-foreground text-muted-foreground">Sessions</TabsTrigger>
          <TabsTrigger value="journal" className="rounded-none shadow-none bg-transparent px-3 py-2 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-foreground data-[state=active]:text-foreground text-muted-foreground">Journal</TabsTrigger>
          <TabsTrigger value="transactions" className="rounded-none shadow-none bg-transparent px-3 py-2 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-foreground data-[state=active]:text-foreground text-muted-foreground">Transactions</TabsTrigger>
          <TabsTrigger value="missed-trades" className="rounded-none shadow-none bg-transparent px-3 py-2 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-foreground data-[state=active]:text-foreground text-muted-foreground">Missed Trades</TabsTrigger>
          <TabsTrigger value="chartbook" className="rounded-none shadow-none bg-transparent px-3 py-2 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-foreground data-[state=active]:text-foreground text-muted-foreground">Attachments</TabsTrigger>
        </TabsList>

        <TabsContent value="sessions">
          <SessionsTab />
        </TabsContent>

        <TabsContent value="journal">
          <JournalHistoryTab />
        </TabsContent>

        <TabsContent value="transactions">
          {!initialized || (isAnyLoading && allTrades.length === 0) ? (
            <div className="py-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                <div className="h-4 w-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
                <span>Loading trades<span className="animate-pulse">...</span></span>
              </div>
              <TableRowsSkeleton rows={5} cols={6} />
            </div>
          ) : !hasActiveWallets ? (
            <p className="text-sm text-muted-foreground py-4">
              Activate a wallet in Wallet Management to view trade history.
            </p>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-4 mt-4">
                <span className="text-sm text-muted-foreground">
                  {allTrades.length} transactions
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refreshAll()}
                  disabled={isAnyLoading}
                >
                  {isAnyLoading ? 'Refreshing...' : 'Refresh'}
                </Button>
              </div>

              {allTrades.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No transactions found for your active wallets.
                </p>
              ) : (
                <TradesTable trades={allTrades as any} />
              )}
            </div>
          )}
        </TabsContent>
        <TabsContent value="missed-trades">
          <MissedTradesTab />
        </TabsContent>
        <TabsContent value="chartbook">
          <ChartbookTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

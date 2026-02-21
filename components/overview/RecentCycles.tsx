'use client'

import { useMemo, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatValue } from '@/lib/formatters'
import { format } from 'date-fns'
import Link from 'next/link'
import type { FlattenedTrade } from '@/lib/tradeCycles'
import JournalModal, { type JournalData } from '@/components/JournalModal'
import { useWallet } from '@/lib/wallet-context'
import { saveJournal } from '@/lib/journals'
import { TokenWithBadge } from '@/components/chain-badge'

interface RecentCyclesProps {
  trades: FlattenedTrade[]
}

function journalKey(t: FlattenedTrade) {
  return `${t.tokenMint}-${t.tradeNumber}-${t.walletAddress}`
}


export function RecentCycles({ trades }: RecentCyclesProps) {
  const { journalMap, updateJournalEntry } = useWallet()
  const [selectedTrade, setSelectedTrade] = useState<FlattenedTrade | null>(null)

  const recentCompleted = useMemo(
    () => trades.filter((t) => t.isComplete).slice(0, 8),
    [trades]
  )

  const handleSave = useCallback(async (data: JournalData) => {
    if (!selectedTrade) return
    const key = journalKey(selectedTrade)
    const saved = await saveJournal({
      walletAddress: selectedTrade.walletAddress,
      tokenMint: selectedTrade.tokenMint,
      tradeNumber: selectedTrade.tradeNumber,
      ...data,
    })
    updateJournalEntry(key, saved)
    setSelectedTrade(null)
  }, [selectedTrade, updateJournalEntry])

  const getInitialData = useCallback((t: FlattenedTrade): JournalData | null => {
    const key = journalKey(t)
    return journalMap[key] || null
  }, [journalMap])

  return (
    <>
      <Card className="col-span-1">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Recent Trades</CardTitle>
            <Link href="/trade-journal" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              View all &rarr;
            </Link>
          </div>
        </CardHeader>
        <CardContent className="pb-3">
          {recentCompleted.length === 0 ? (
            <p className="text-xs text-muted-foreground">No completed trades yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[10px] h-7">Token</TableHead>
                  <TableHead className="text-[10px] h-7">Date</TableHead>
                  <TableHead className="text-[10px] h-7 text-right">P/L</TableHead>
                  <TableHead className="text-[10px] h-7 text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentCompleted.map((t) => {
                  const tokenLogo = t.buys[0]?.tokenOut?.logoURI || t.sells[0]?.tokenIn?.logoURI || null
                  const isJournaled = !!journalMap[journalKey(t)]

                  return (
                    <TableRow
                      key={`${t.tokenMint}-${t.tradeNumber}-${t.walletAddress}`}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedTrade(t)}
                    >
                      <TableCell className="text-xs py-1.5">
                        <div className="flex items-center gap-2">
                          <TokenWithBadge chain={t.chain} size="sm">
                            {tokenLogo ? (
                              <img
                                src={tokenLogo}
                                alt={t.token}
                                className="w-5 h-5 rounded-full"
                              />
                            ) : (
                              <div className="w-5 h-5 rounded-full bg-zinc-700 flex items-center justify-center text-[8px] font-bold text-zinc-300">
                                {t.token.slice(0, 2)}
                              </div>
                            )}
                          </TokenWithBadge>
                          <span className="font-medium">{t.token}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs py-1.5 font-mono tabular-nums text-muted-foreground">
                        {t.endDate ? format(new Date(t.endDate * 1000), 'MMM dd') : '-'}
                      </TableCell>
                      <TableCell
                        className={`text-xs py-1.5 text-right font-mono tabular-nums font-medium ${
                          t.profitLoss >= 0 ? 'text-emerald-500' : 'text-red-500'
                        }`}
                      >
                        {t.profitLoss >= 0 ? '+' : ''}{formatValue(t.profitLoss)}
                      </TableCell>
                      <TableCell className="text-xs py-1.5 text-center">
                        {isJournaled ? (
                          <span className="inline-flex items-center gap-1 text-emerald-500">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span className="text-[10px]">Journaled</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-amber-500">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            <span className="text-[10px]">Not journaled</span>
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {selectedTrade && (
        <JournalModal
          key={journalKey(selectedTrade)}
          trade={selectedTrade}
          initialData={getInitialData(selectedTrade)}
          tokenLogo={selectedTrade.buys[0]?.tokenOut?.logoURI || selectedTrade.sells[0]?.tokenIn?.logoURI || null}
          onSave={handleSave}
          onClose={() => setSelectedTrade(null)}
        />
      )}
    </>
  )
}

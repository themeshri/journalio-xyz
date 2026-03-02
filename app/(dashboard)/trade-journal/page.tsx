'use client'

import { useState, useMemo, useCallback } from 'react'
import { useWallet } from '@/lib/wallet-context'
import { saveJournal } from '@/lib/journals'
import { type FlattenedTrade } from '@/lib/tradeCycles'
import { formatValue, formatDuration, formatPrice, formatPercentage } from '@/lib/formatters'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import TransactionModal from '@/components/TransactionModal'
import JournalModal, { JournalData } from '@/components/JournalModal'
import { TableRowsSkeleton } from '@/components/skeletons'
import { toast } from 'sonner'
import { TokenWithBadge } from '@/components/chain-badge'
import { computeTradeDiscipline, disciplineBgClass, disciplineColorClass } from '@/lib/discipline'
import ErrorBoundary from '@/components/ErrorBoundary'
import { ManualTradeDialog } from '@/components/ManualTradeDialog'
import { Plus } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

function relativeTime(timestamp: number): string {
  const now = Date.now() / 1000
  const diff = now - timestamp
  if (diff < 60) return 'Just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 86400 * 30) return `${Math.floor(diff / 86400)}D ago`
  const d = new Date(timestamp * 1000)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function truncateAddress(addr: string) {
  if (addr.length <= 10) return addr
  return `${addr.slice(0, 4)}...${addr.slice(-4)}`
}

function journalKey(trade: FlattenedTrade) {
  return `${trade.tokenMint}-${trade.tradeNumber}-${trade.walletAddress}`
}

export default function TradeJournalPage() {
  const {
    activeWallets, flattenedTrades: baseTrades, isAnyLoading, hasActiveWallets, allTrades,
    tradeComments, strategies, journalMap, updateJournalEntry,
    walletTokens, loadingBalances, balancesFetched, balanceError,
    refreshAll,
  } = useWallet()

  // Modal state
  const [buysModalTrade, setBuysModalTrade] = useState<FlattenedTrade | null>(null)
  const [sellsModalTrade, setSellsModalTrade] = useState<FlattenedTrade | null>(null)
  const [journalModalTrade, setJournalModalTrade] = useState<FlattenedTrade | null>(null)
  const [showManualTrade, setShowManualTrade] = useState(false)

  // Strategies as a Map for quick lookup
  const strategiesMap = useMemo(
    () => new Map(strategies.map((s) => [s.id, s])),
    [strategies]
  )

  // Enrich with balance data separately — baseTrades come from context (no recomputation)
  const flattenedTrades = useMemo(() => {
    if (!balancesFetched || loadingBalances) return baseTrades

    return baseTrades.map((trade) => {
      const balanceKey = `${trade.chain}:${trade.walletAddress}`
      const tokens = walletTokens.get(balanceKey) || []
      const walletToken = tokens.find((t: any) => t.address === trade.tokenMint)
      const actualBalance = walletToken?.balance || 0
      const usdValue = walletToken?.valueUSD || 0
      const finalBalance = usdValue < 1 ? 0 : actualBalance

      if (!walletToken || (walletToken.balance || 0) < 100) {
        return {
          ...trade,
          isComplete: true,
          endBalance: finalBalance,
          endDate: trade.endDate || trade.startDate,
          duration: trade.duration || 0,
        }
      }

      return { ...trade, endBalance: finalBalance }
    })
  }, [baseTrades, balancesFetched, loadingBalances, walletTokens])

  const getJournal = useCallback((trade: FlattenedTrade) => {
    return journalMap[journalKey(trade)] || null
  }, [journalMap])

  const handleJournalSave = useCallback(async (data: JournalData) => {
    if (!journalModalTrade) return
    const key = journalKey(journalModalTrade)
    const saved = await saveJournal({
      walletAddress: journalModalTrade.walletAddress,
      tokenMint: journalModalTrade.tokenMint,
      tradeNumber: journalModalTrade.tradeNumber,
      ...data,
    })
    if (saved) {
      updateJournalEntry(key, saved)
    }
    setJournalModalTrade(null)
  }, [journalModalTrade, updateJournalEntry])

  const handleJournalSaveAndNext = useCallback(async (data: JournalData) => {
    if (!journalModalTrade) return
    const key = journalKey(journalModalTrade)
    const saved = await saveJournal({
      walletAddress: journalModalTrade.walletAddress,
      tokenMint: journalModalTrade.tokenMint,
      tradeNumber: journalModalTrade.tradeNumber,
      ...data,
    })
    if (saved) {
      updateJournalEntry(key, saved)
    }

    // Find next un-journaled trade (use updated map with the new entry)
    const updatedMap = { ...journalMap, [key]: saved || data }
    const currentIdx = flattenedTrades.indexOf(journalModalTrade)
    const nextTrade = flattenedTrades.find(
      (t, i) => i > currentIdx && !updatedMap[journalKey(t)]
    )

    if (nextTrade) {
      setJournalModalTrade(nextTrade)
    } else {
      setJournalModalTrade(null)
      toast.success('All trades journaled!')
    }
  }, [journalModalTrade, journalMap, flattenedTrades, updateJournalEntry])

  if (!hasActiveWallets) {
    return (
      <div className="max-w-xl pt-8">
        <h1 className="text-xl font-semibold mb-2">Trade Journal</h1>
        <p className="text-sm text-muted-foreground">
          Go to Wallet Management to add a wallet and start journaling.
        </p>
      </div>
    )
  }

  if (isAnyLoading && allTrades.length === 0) {
    return (
      <div className="pt-8">
        <h1 className="text-xl font-semibold mb-6">Trade Journal</h1>
        <TableRowsSkeleton rows={5} cols={8} />
      </div>
    )
  }

  if (allTrades.length === 0) {
    return (
      <div className="max-w-xl pt-8">
        <h1 className="text-xl font-semibold mb-2">Trade Journal</h1>
        <p className="text-sm text-muted-foreground">No trade cycles to display.</p>
      </div>
    )
  }

  function renderTradeRow(trade: FlattenedTrade) {
    const avgBuyPrice = trade.totalBuyAmount > 0 ? trade.totalBuyValue / trade.totalBuyAmount : 0
    const avgSellPrice = trade.totalSellAmount > 0 ? trade.totalSellValue / trade.totalSellAmount : 0
    const plPercent = trade.totalBuyValue > 0 ? (trade.profitLoss / trade.totalBuyValue) * 100 : 0
    const journal = getJournal(trade)
    const tokenLogo = trade.buys[0]?.tokenOut?.logoURI || trade.sells[0]?.tokenIn?.logoURI || null

    return (
      <TableRow
        key={`${trade.tokenMint}-${trade.tradeNumber}-${trade.walletAddress}`}
        className="cursor-pointer hover:bg-muted/50"
        onClick={() => setJournalModalTrade(trade)}
      >
        {/* Token */}
        <TableCell>
          <div className="flex items-center gap-2">
            <TokenWithBadge chain={trade.chain} size="md">
              {tokenLogo ? (
                <img
                  src={tokenLogo}
                  alt={trade.token}
                  className="w-7 h-7 rounded-full"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground">
                  {trade.token.charAt(0)}
                </div>
              )}
            </TokenWithBadge>
            <div>
              <div className="font-semibold text-sm">{trade.token}</div>
              <div className="text-xs text-muted-foreground">
                {relativeTime(trade.startDate)} | {truncateAddress(trade.tokenMint)}
              </div>
            </div>
          </div>
        </TableCell>

        {/* PnL */}
        <TableCell className="text-right">
          <div
            className={`font-mono tabular-nums text-sm font-medium ${
              trade.profitLoss >= 0 ? 'text-emerald-600' : 'text-red-600'
            }`}
          >
            {formatValue(trade.profitLoss, true)}
          </div>
          <div
            className={`font-mono tabular-nums text-xs ${
              plPercent >= 0 ? 'text-emerald-600' : 'text-red-600'
            }`}
          >
            {formatPercentage(plPercent)}
          </div>
        </TableCell>

        {/* Balance */}
        <TableCell className="text-right">
          {trade.isComplete ? (
            <span className="text-xs text-muted-foreground">Sold all</span>
          ) : (
            <div className="font-mono tabular-nums text-sm">
              {trade.endBalance > 0
                ? trade.endBalance.toLocaleString('en-US', { maximumFractionDigits: 0 })
                : '0'}
            </div>
          )}
        </TableCell>

        {/* Duration */}
        <TableCell className="text-right font-mono tabular-nums text-xs text-muted-foreground">
          {trade.duration ? formatDuration(trade.duration) : '-'}
        </TableCell>

        {/* Strategy */}
        <TableCell className="text-center">
          {(() => {
            const strat = journal?.strategyId ? strategiesMap.get(journal.strategyId) : null
            if (!strat) return <span className="text-xs text-muted-foreground">&mdash;</span>
            return (
              <span className="text-xs flex items-center gap-1 justify-center">
                <span>{strat.icon}</span>
                <span className="truncate max-w-[80px]">{strat.name}</span>
              </span>
            )
          })()}
        </TableCell>

        {/* Follow Rate */}
        <TableCell className="text-center">
          {(() => {
            if (!journal?.ruleResults || !journal?.strategyId) {
              return <span className="text-xs text-muted-foreground">&mdash;</span>
            }
            const total = journal.ruleResults.length
            if (total === 0) return <span className="text-xs text-muted-foreground">&mdash;</span>
            const followed = journal.ruleResults.filter((r: any) => r.followed).length
            const pct = Math.round((followed / total) * 100)
            const color = pct >= 75 ? 'text-emerald-600' : pct >= 50 ? 'text-amber-600' : 'text-red-600'
            return (
              <span className={`text-xs font-mono tabular-nums font-medium ${color}`}>
                {pct}%
                <span className="text-muted-foreground font-normal ml-0.5">({followed}/{total})</span>
              </span>
            )
          })()}
        </TableCell>

        {/* Bought */}
        <TableCell className="text-right">
          <div className="font-mono tabular-nums text-sm">
            {formatValue(trade.totalBuyValue)}
          </div>
          <div className="font-mono tabular-nums text-xs text-muted-foreground">
            {formatPrice(avgBuyPrice)}
          </div>
        </TableCell>

        {/* Sold */}
        <TableCell className="text-right">
          <div className="font-mono tabular-nums text-sm">
            {formatValue(trade.totalSellValue)}
          </div>
          <div className="font-mono tabular-nums text-xs text-muted-foreground">
            {avgSellPrice > 0 ? formatPrice(avgSellPrice) : '-'}
          </div>
        </TableCell>

        {/* Buys/Sells */}
        <TableCell className="text-center">
          <span className="font-mono tabular-nums text-sm">
            <button
              className="text-emerald-600 hover:underline underline-offset-2"
              onClick={(e) => { e.stopPropagation(); setBuysModalTrade(trade) }}
            >
              {trade.buys.length}
            </button>
            <span className="text-muted-foreground mx-1">|</span>
            <button
              className="text-red-600 hover:underline underline-offset-2"
              onClick={(e) => { e.stopPropagation(); setSellsModalTrade(trade) }}
            >
              {trade.sells.length}
            </button>
          </span>
        </TableCell>

        {/* Discipline */}
        <TableCell className="text-center">
          {(() => {
            const discipline = computeTradeDiscipline(journal, tradeComments)
            if (!discipline) return <span className="text-xs text-muted-foreground">&mdash;</span>
            return (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="inline-flex flex-col items-center gap-0.5 cursor-default">
                    <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${disciplineBgClass(discipline.percentage)}`}
                        style={{ width: `${discipline.percentage}%` }}
                      />
                    </div>
                    <span className={`text-[10px] font-mono tabular-nums ${disciplineColorClass(discipline.percentage)}`}>
                      {Math.round(discipline.percentage)}%
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs space-y-1">
                  {discipline.entryComment && (
                    <div className="flex items-center gap-1.5">
                      <span>{discipline.entryComment.rating === 'positive' ? '\u2713' : discipline.entryComment.rating === 'negative' ? '\u2717' : '\u2014'}</span>
                      <span>Entry: {discipline.entryComment.label}</span>
                    </div>
                  )}
                  {discipline.exitComment && (
                    <div className="flex items-center gap-1.5">
                      <span>{discipline.exitComment.rating === 'positive' ? '\u2713' : discipline.exitComment.rating === 'negative' ? '\u2717' : '\u2014'}</span>
                      <span>Exit: {discipline.exitComment.label}</span>
                    </div>
                  )}
                  {discipline.managementComment && (
                    <div className="flex items-center gap-1.5">
                      <span>{discipline.managementComment.rating === 'positive' ? '\u2713' : discipline.managementComment.rating === 'negative' ? '\u2717' : '\u2014'}</span>
                      <span>Mgmt: {discipline.managementComment.label}</span>
                    </div>
                  )}
                </TooltipContent>
              </Tooltip>
            )
          })()}
        </TableCell>

        {/* Actions */}
        <TableCell className="text-center">
          {journal ? (
            <span className="text-xs text-emerald-600 font-medium">Journaled</span>
          ) : (
            <span className="text-xs text-muted-foreground">Not Journaled</span>
          )}
        </TableCell>
      </TableRow>
    )
  }

  function renderTable(trades: FlattenedTrade[]) {
    return (
      <TooltipProvider>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[140px]">Token</TableHead>
              <TableHead className="text-right min-w-[100px]">PnL</TableHead>
              <TableHead className="text-right min-w-[80px]">Balance</TableHead>
              <TableHead className="text-right min-w-[70px]">Duration</TableHead>
              <TableHead className="text-center min-w-[90px]">Strategy</TableHead>
              <TableHead className="text-center min-w-[80px]">Follow Rate</TableHead>
              <TableHead className="text-right min-w-[100px]">Bought</TableHead>
              <TableHead className="text-right min-w-[100px]">Sold</TableHead>
              <TableHead className="text-center min-w-[80px]">Buys/Sells</TableHead>
              <TableHead className="text-center min-w-[80px]">Discipline</TableHead>
              <TableHead className="text-center min-w-[70px]">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {trades.map(renderTradeRow)}
          </TableBody>
        </Table>
      </div>
      </TooltipProvider>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">Trade Journal</h1>
        <Button size="sm" variant="outline" onClick={() => setShowManualTrade(true)}>
          <Plus className="w-4 h-4 mr-1" />
          Add Manual Trade
        </Button>
      </div>

      {loadingBalances && (
        <p className="text-xs text-muted-foreground mb-4">Loading balances...</p>
      )}
      {balanceError && (
        <p className="text-xs text-destructive mb-4">{balanceError}</p>
      )}

      {/* Table */}
      <p className="text-xs text-muted-foreground mb-2 md:hidden">Scroll horizontally to see all columns</p>
      <ErrorBoundary fallback={
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-muted-foreground">
          Something went wrong loading the trade table. Try refreshing the page.
        </div>
      }>
      {renderTable(flattenedTrades)}
      </ErrorBoundary>

      {/* Modals */}
      {buysModalTrade && (
        <TransactionModal
          trades={buysModalTrade.buys}
          title={`${buysModalTrade.token} - Buy Transactions (${buysModalTrade.buys.length})`}
          onClose={() => setBuysModalTrade(null)}
          chain={buysModalTrade.chain}
        />
      )}
      {sellsModalTrade && (
        <TransactionModal
          trades={sellsModalTrade.sells}
          title={`${sellsModalTrade.token} - Sell Transactions (${sellsModalTrade.sells.length})`}
          onClose={() => setSellsModalTrade(null)}
          chain={sellsModalTrade.chain}
        />
      )}
      {journalModalTrade && (() => {
        const hasNextUnjournaled = flattenedTrades.some(
          (t) => t !== journalModalTrade && !journalMap[journalKey(t)]
        )
        return (
          <JournalModal
            key={`${journalModalTrade.tokenMint}-${journalModalTrade.tradeNumber}-${journalModalTrade.walletAddress}`}
            trade={journalModalTrade}
            initialData={getJournal(journalModalTrade)}
            tokenLogo={journalModalTrade.buys[0]?.tokenOut?.logoURI || journalModalTrade.sells[0]?.tokenIn?.logoURI || null}
            onSave={handleJournalSave}
            onSaveAndNext={hasNextUnjournaled ? handleJournalSaveAndNext : undefined}
            onClose={() => setJournalModalTrade(null)}
          />
        )
      })()}
      {showManualTrade && activeWallets[0] && (
        <ManualTradeDialog
          walletAddress={activeWallets[0].address}
          chain={activeWallets[0].chain}
          onClose={() => setShowManualTrade(false)}
          onSaved={() => { setShowManualTrade(false); refreshAll() }}
        />
      )}
    </div>
  )
}

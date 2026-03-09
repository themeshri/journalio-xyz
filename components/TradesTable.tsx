'use client'

import { useState, memo } from 'react'
import { Trade } from '@/lib/solana-tracker'
import { formatPrice, formatMarketCap } from '@/lib/formatters'
import { format } from 'date-fns'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Chain, explorerTxUrl } from '@/lib/chains'
import { TokenWithBadge } from '@/components/chain-badge'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Settings2 } from 'lucide-react'

interface TradesTableProps {
  trades: Trade[]
  chain?: Chain // optional fallback; per-trade _chain preferred
}

const PAGE_SIZE = 50

type ColumnKey = 'time' | 'type' | 'tokenIn' | 'tokenOut' | 'amountIn' | 'amountOut' | 'value' | 'price' | 'dex' | 'tx'

const ALL_COLUMNS: { key: ColumnKey; label: string }[] = [
  { key: 'time', label: 'Time' },
  { key: 'type', label: 'Type' },
  { key: 'tokenIn', label: 'Token In' },
  { key: 'tokenOut', label: 'Token Out' },
  { key: 'amountIn', label: 'Amount In' },
  { key: 'amountOut', label: 'Amount Out' },
  { key: 'value', label: 'Value' },
  { key: 'price', label: 'Price' },
  { key: 'dex', label: 'DEX' },
  { key: 'tx', label: 'Tx' },
]

const DEFAULT_VISIBLE: ColumnKey[] = ['time', 'type', 'tokenIn', 'tokenOut', 'amountIn', 'amountOut', 'value', 'price', 'dex', 'tx']

export const TradesTable = memo(function TradesTable({
  trades,
  chain,
}: TradesTableProps) {
  const [page, setPage] = useState(0)
  const [visibleCols, setVisibleCols] = useState<Set<ColumnKey>>(new Set(DEFAULT_VISIBLE))

  const totalPages = Math.ceil(trades.length / PAGE_SIZE)
  const paginated = trades.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  function getChain(trade: any): Chain {
    return trade._chain || chain || 'solana'
  }

  function toggleColumn(key: ColumnKey) {
    setVisibleCols((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        // Don't allow hiding all columns
        if (next.size <= 2) return prev
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  const show = (key: ColumnKey) => visibleCols.has(key)

  return (
    <div>
      <div className="flex justify-end mb-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5">
              <Settings2 className="w-3.5 h-3.5" />
              Columns
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-40 p-2">
            {ALL_COLUMNS.map((col) => (
              <label key={col.key} className="flex items-center gap-2 py-1 px-1 text-xs cursor-pointer hover:bg-muted rounded">
                <input
                  type="checkbox"
                  checked={visibleCols.has(col.key)}
                  onChange={() => toggleColumn(col.key)}
                  className="rounded border-border"
                />
                {col.label}
              </label>
            ))}
          </PopoverContent>
        </Popover>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            {show('time') && <TableHead className="w-[120px]">Time</TableHead>}
            {show('type') && <TableHead className="w-[50px]">Type</TableHead>}
            {show('tokenIn') && <TableHead>Token In</TableHead>}
            {show('tokenOut') && <TableHead>Token Out</TableHead>}
            {show('amountIn') && <TableHead className="text-right">Amount In</TableHead>}
            {show('amountOut') && <TableHead className="text-right">Amount Out</TableHead>}
            {show('value') && <TableHead className="text-right">Value</TableHead>}
            {show('price') && <TableHead className="text-right">Price</TableHead>}
            {show('dex') && <TableHead>DEX</TableHead>}
            {show('tx') && <TableHead className="w-[60px]">Tx</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginated.map((trade, i) => (
            <TableRow key={`${trade.signature}-${i}`}>
              {show('time') && (
                <TableCell className="font-mono text-xs tabular-nums">
                  {formatTimestamp(trade.timestamp)}
                </TableCell>
              )}
              {show('type') && (
                <TableCell>
                  <span
                    className={`text-xs font-medium ${
                      trade.type === 'buy'
                        ? 'text-emerald-600'
                        : trade.type === 'sell'
                          ? 'text-red-600'
                          : 'text-muted-foreground'
                    }`}
                  >
                    {trade.type}
                  </span>
                </TableCell>
              )}
              {show('tokenIn') && (
                <TableCell className="text-xs">
                  <span className="flex items-center gap-1.5">
                    {trade.tokenIn?.logoURI && (
                      <TokenWithBadge chain={getChain(trade)} size="sm">
                        <img
                          src={trade.tokenIn.logoURI}
                          alt=""
                          className="w-4 h-4 rounded-full"
                        />
                      </TokenWithBadge>
                    )}
                    {trade.tokenIn?.symbol || '?'}
                  </span>
                </TableCell>
              )}
              {show('tokenOut') && (
                <TableCell className="text-xs">
                  <span className="flex items-center gap-1.5">
                    {trade.tokenOut?.logoURI && (
                      <TokenWithBadge chain={getChain(trade)} size="sm">
                        <img
                          src={trade.tokenOut.logoURI}
                          alt=""
                          className="w-4 h-4 rounded-full"
                        />
                      </TokenWithBadge>
                    )}
                    {trade.tokenOut?.symbol || '?'}
                  </span>
                </TableCell>
              )}
              {show('amountIn') && (
                <TableCell className="text-right font-mono text-xs tabular-nums">
                  {formatNum(trade.amountIn)}
                </TableCell>
              )}
              {show('amountOut') && (
                <TableCell className="text-right font-mono text-xs tabular-nums">
                  {formatNum(trade.amountOut)}
                </TableCell>
              )}
              {show('value') && (
                <TableCell className="text-right font-mono text-xs tabular-nums">
                  ${trade.valueUSD?.toFixed(2) ?? '0.00'}
                </TableCell>
              )}
              {show('price') && (
                <TableCell className="text-right font-mono text-xs tabular-nums">
                  {formatPrice(trade.priceUSD)}
                </TableCell>
              )}
              {show('dex') && (
                <TableCell className="text-xs text-muted-foreground">
                  {trade.dex}
                </TableCell>
              )}
              {show('tx') && (
                <TableCell>
                  <a
                    href={explorerTxUrl(getChain(trade), trade.signature)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline"
                  >
                    View
                  </a>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm">
          <span className="text-xs text-muted-foreground">
            Page {page + 1} of {totalPages}
          </span>
          <div className="flex gap-1.5">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
            >
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages - 1}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
})

function formatTimestamp(ts: number) {
  try {
    return format(new Date(ts * 1000), 'MMM dd HH:mm')
  } catch {
    return '-'
  }
}

function formatNum(num: number) {
  if (num === 0) return '0'
  if (num < 0.01) return num.toExponential(2)
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  })
}

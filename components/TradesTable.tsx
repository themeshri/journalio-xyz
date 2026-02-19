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

interface TradesTableProps {
  trades: Trade[]
  chain?: Chain // optional fallback; per-trade _chain preferred
}

const PAGE_SIZE = 50

export const TradesTable = memo(function TradesTable({
  trades,
  chain,
}: TradesTableProps) {
  const [page, setPage] = useState(0)

  const totalPages = Math.ceil(trades.length / PAGE_SIZE)
  const paginated = trades.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  function getChain(trade: any): Chain {
    return trade._chain || chain || 'solana'
  }

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[120px]">Time</TableHead>
            <TableHead className="w-[50px]">Type</TableHead>
            <TableHead>Token In</TableHead>
            <TableHead>Token Out</TableHead>
            <TableHead className="text-right">Amount In</TableHead>
            <TableHead className="text-right">Amount Out</TableHead>
            <TableHead className="text-right hidden md:table-cell">Value</TableHead>
            <TableHead className="text-right hidden md:table-cell">Price</TableHead>
            <TableHead className="hidden lg:table-cell">DEX</TableHead>
            <TableHead className="w-[60px]">Tx</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginated.map((trade, i) => (
            <TableRow key={`${trade.signature}-${i}`}>
              <TableCell className="font-mono text-xs tabular-nums">
                {formatTimestamp(trade.timestamp)}
              </TableCell>
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
              <TableCell className="text-right font-mono text-xs tabular-nums">
                {formatNum(trade.amountIn)}
              </TableCell>
              <TableCell className="text-right font-mono text-xs tabular-nums">
                {formatNum(trade.amountOut)}
              </TableCell>
              <TableCell className="text-right font-mono text-xs tabular-nums hidden md:table-cell">
                ${trade.valueUSD?.toFixed(2) ?? '0.00'}
              </TableCell>
              <TableCell className="text-right font-mono text-xs tabular-nums hidden md:table-cell">
                {formatPrice(trade.priceUSD)}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground hidden lg:table-cell">
                {trade.dex}
              </TableCell>
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

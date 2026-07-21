'use client'

import { useState, memo } from 'react'
import { Trade } from '@/lib/solana-tracker'
import { formatPrice, formatMarketCap } from '@/lib/formatters'
import { format } from 'date-fns'
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Button,
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@heroui/react'
import { Chain, explorerTxUrl } from '@/lib/chains'
import { TokenWithBadge } from '@/components/chain-badge'
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
          <PopoverTrigger>
            <Button variant="bordered" size="sm" className="h-7 text-xs gap-1.5">
              <Settings2 className="w-3.5 h-3.5" />
              Columns
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-40 p-2">
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
      <Table aria-label="Transactions">
        <TableHeader>
          {[
            show('time') && <TableColumn key="time" className="w-[120px]">Time</TableColumn>,
            show('type') && <TableColumn key="type" className="w-[50px]">Type</TableColumn>,
            show('tokenIn') && <TableColumn key="tokenIn">Token In</TableColumn>,
            show('tokenOut') && <TableColumn key="tokenOut">Token Out</TableColumn>,
            show('amountIn') && <TableColumn key="amountIn" className="text-right">Amount In</TableColumn>,
            show('amountOut') && <TableColumn key="amountOut" className="text-right">Amount Out</TableColumn>,
            show('value') && <TableColumn key="value" className="text-right">Value</TableColumn>,
            show('price') && <TableColumn key="price" className="text-right">Price</TableColumn>,
            show('dex') && <TableColumn key="dex">DEX</TableColumn>,
            show('tx') && <TableColumn key="tx" className="w-[60px]">Tx</TableColumn>,
          ].filter(Boolean) as any}
        </TableHeader>
        <TableBody>
          {paginated.map((trade, i) => (
            <TableRow key={`${trade.signature}-${i}`}>
              {[
                show('time') && (
                  <TableCell key="time" className="font-mono text-xs tabular-nums">
                    {formatTimestamp(trade.timestamp)}
                  </TableCell>
                ),
                show('type') && (
                  <TableCell key="type">
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
                ),
                show('tokenIn') && (
                  <TableCell key="tokenIn" className="text-xs">
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
                ),
                show('tokenOut') && (
                  <TableCell key="tokenOut" className="text-xs">
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
                ),
                show('amountIn') && (
                  <TableCell key="amountIn" className="text-right font-mono text-xs tabular-nums">
                    {formatNum(trade.amountIn)}
                  </TableCell>
                ),
                show('amountOut') && (
                  <TableCell key="amountOut" className="text-right font-mono text-xs tabular-nums">
                    {formatNum(trade.amountOut)}
                  </TableCell>
                ),
                show('value') && (
                  <TableCell key="value" className="text-right font-mono text-xs tabular-nums">
                    ${trade.valueUSD?.toFixed(2) ?? '0.00'}
                  </TableCell>
                ),
                show('price') && (
                  <TableCell key="price" className="text-right font-mono text-xs tabular-nums">
                    {formatPrice(trade.priceUSD)}
                  </TableCell>
                ),
                show('dex') && (
                  <TableCell key="dex" className="text-xs text-muted-foreground">
                    {trade.dex}
                  </TableCell>
                ),
                show('tx') && (
                  <TableCell key="tx">
                    <a
                      href={explorerTxUrl(getChain(trade), trade.signature)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline"
                    >
                      View
                    </a>
                  </TableCell>
                ),
              ].filter(Boolean) as any}
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
              variant="bordered"
              size="sm"
              isDisabled={page === 0}
              onPress={() => setPage(page - 1)}
            >
              Prev
            </Button>
            <Button
              variant="bordered"
              size="sm"
              isDisabled={page >= totalPages - 1}
              onPress={() => setPage(page + 1)}
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

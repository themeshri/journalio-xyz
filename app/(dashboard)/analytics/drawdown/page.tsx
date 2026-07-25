'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Wallet, TrendingDown } from 'lucide-react'
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { useWallet, buildWalletQueryParams } from '@/lib/wallet-context'
import { useDrawdownAnalytics } from '@/lib/hooks/use-analytics'
import { formatValue } from '@/lib/formatters'

export default function DrawdownPage() {
  const { activeWallets } = useWallet()

  const walletQueryParams = useMemo(
    () => buildWalletQueryParams(activeWallets) || null,
    [activeWallets]
  )

  const { data, isLoading } = useDrawdownAnalytics(walletQueryParams)

  if (activeWallets.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-lg font-semibold">Drawdown</h1>
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <Wallet className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium">No wallet selected</p>
            <p className="text-xs text-muted-foreground">
              Activate a wallet in Wallets to see your balance curve.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Named empty state (docs §5): say exactly what is missing and where to fix it,
  // rather than drawing a curve anchored at a fictional zero.
  if (data && !data.hasInitialBalance) {
    return (
      <div className="space-y-4">
        <h1 className="text-lg font-semibold">Drawdown</h1>
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <TrendingDown className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Please add a starting balance</p>
              <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
                The balance curve needs an origin. Set the starting balance for your
                active wallet and this chart will fill in.
              </p>
            </div>
            <Button asChild size="sm">
              <Link href="/wallet-management">
                <Wallet className="mr-1.5 h-3.5 w-3.5" />
                Manage wallets
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const points = data?.points ?? []

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Drawdown</h1>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Account balance over time and how far below its running peak it fell.
          Based on realized P&amp;L from closed trades — open positions
          (unrealized) are not included.
        </p>
      </div>

      {isLoading && !data ? (
        <Card>
          <CardContent className="py-12 text-center text-xs text-muted-foreground">
            Loading…
          </CardContent>
        </Card>
      ) : points.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm font-medium">No completed trades yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              The curve plots one point per closed trade cycle.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-4">
            {[
              { label: 'Starting', value: formatValue(data?.startingBalance ?? 0) },
              { label: 'Current', value: formatValue(data?.endingBalance ?? 0) },
              { label: 'Peak', value: formatValue(data?.peakBalance ?? 0) },
              {
                label: 'Max drawdown',
                value: `${data?.maxDrawdownPct ?? 0}%`,
                sub: data?.maxDrawdownDate ?? undefined,
                danger: true,
              },
            ].map((s) => (
              <Card key={s.label}>
                <CardContent className="p-4">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    {s.label}
                  </p>
                  <p
                    className={`mt-1 font-mono text-lg font-semibold tabular-nums ${
                      s.danger ? 'text-red-500' : ''
                    }`}
                  >
                    {s.value}
                  </p>
                  {s.sub && (
                    <p className="mt-0.5 text-[10px] text-muted-foreground">on {s.sub}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Account balance</CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={points}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} minTickGap={24} />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    tickFormatter={(v) => formatValue(Number(v))}
                    width={70}
                  />
                  <Tooltip
                    formatter={(v: number) => formatValue(v)}
                    contentStyle={{ fontSize: 12 }}
                  />
                  <ReferenceLine
                    y={data?.startingBalance}
                    stroke="currentColor"
                    strokeDasharray="4 4"
                    className="text-muted-foreground"
                  />
                  <Line
                    type="monotone"
                    dataKey="balance"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="peak"
                    stroke="#71717a"
                    strokeWidth={1}
                    strokeDasharray="3 3"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Drawdown from peak</CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={points}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} minTickGap={24} />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    tickFormatter={(v) => `${v}%`}
                    width={44}
                    // Drawdown reads naturally as a descent below the peak line.
                    reversed
                  />
                  <Tooltip
                    formatter={(v: number) => `${v}%`}
                    contentStyle={{ fontSize: 12 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="drawdownPct"
                    stroke="#ef4444"
                    fill="#ef4444"
                    fillOpacity={0.15}
                    strokeWidth={1.5}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {data && data.walletsMissingBalance.length > 0 && (
            <p className="text-[11px] text-amber-500">
              {data.walletsMissingBalance.length} active wallet
              {data.walletsMissingBalance.length === 1 ? ' has' : 's have'} no starting
              balance and {data.walletsMissingBalance.length === 1 ? 'is' : 'are'} excluded.{' '}
              <Link href="/wallet-management" className="underline">
                Set them in Wallets
              </Link>
              .
            </p>
          )}
        </>
      )}
    </div>
  )
}

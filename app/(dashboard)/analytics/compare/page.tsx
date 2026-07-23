'use client'

import { useMemo, useCallback } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { X, GitCompare } from 'lucide-react'
import { useWallet, useMetadata, buildWalletQueryParams } from '@/lib/wallet-context'
import { useCompareAnalytics } from '@/lib/hooks/use-analytics'
import { formatValue } from '@/lib/formatters'

const OUTCOMES = [
  { value: 'all', label: 'All outcomes' },
  { value: 'win', label: 'Winners' },
  { value: 'loss', label: 'Losers' },
  { value: 'breakeven', label: 'Breakeven' },
]

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

/** One cohort's filter controls. All state lives in the URL under `prefix`. */
function CohortFilters({
  prefix,
  label,
  accent,
}: {
  prefix: 'a.' | 'b.'
  label: string
  accent: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { strategies, tags } = useMetadata()

  const get = (k: string) => searchParams.get(`${prefix}${k}`) ?? ''

  const setParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value === '' || value === 'all') params.delete(`${prefix}${key}`)
      else params.set(`${prefix}${key}`, value)
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [router, pathname, searchParams, prefix]
  )

  const mistakeTags = tags.filter((t) => t.kind === 'mistake' && !t.isArchived)

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${accent}`} />
        <span className="text-xs font-medium">{label}</span>
      </div>

      <Select value={get('outcome') || 'all'} onValueChange={(v) => setParam('outcome', v)}>
        <SelectTrigger className="h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {OUTCOMES.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={get('day') || 'all'} onValueChange={(v) => setParam('day', v)}>
        <SelectTrigger className="h-8 text-xs">
          <SelectValue placeholder="Any day" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Any day</SelectItem>
          {DAYS.map((d, i) => (
            <SelectItem key={d} value={String(i)}>
              {d}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={get('strategyId') || 'all'} onValueChange={(v) => setParam('strategyId', v)}>
        <SelectTrigger className="h-8 text-xs">
          <SelectValue placeholder="Any strategy" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Any strategy</SelectItem>
          {strategies.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {s.icon} {s.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {mistakeTags.length > 0 && (
        <Select value={get('tags') || 'all'} onValueChange={(v) => setParam('tags', v)}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Any mistake" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any mistake</SelectItem>
            {mistakeTags.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <div className="flex gap-1.5">
        <Input
          type="number"
          placeholder="Min P/L"
          value={get('minPl')}
          onChange={(e) => setParam('minPl', e.target.value)}
          className="h-8 text-xs"
        />
        <Input
          type="number"
          placeholder="Max P/L"
          value={get('maxPl')}
          onChange={(e) => setParam('maxPl', e.target.value)}
          className="h-8 text-xs"
        />
      </div>
    </div>
  )
}

function StatRow({
  label,
  a,
  b,
  delta,
  format,
  higherIsBetter = true,
}: {
  label: string
  a: number
  b: number
  delta: number
  format: (n: number) => string
  higherIsBetter?: boolean
}) {
  const better = higherIsBetter ? delta > 0 : delta < 0
  const neutral = delta === 0
  return (
    <tr className="border-b last:border-0">
      <td className="py-2 pr-2 text-muted-foreground">{label}</td>
      <td className="py-2 text-right font-mono tabular-nums">{format(a)}</td>
      <td className="py-2 text-right font-mono tabular-nums">{format(b)}</td>
      <td
        className={`py-2 text-right font-mono tabular-nums ${
          neutral ? 'text-muted-foreground' : better ? 'text-emerald-500' : 'text-red-500'
        }`}
      >
        {delta > 0 ? '+' : ''}
        {format(delta)}
      </td>
    </tr>
  )
}

export default function ComparePage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { activeWallets, flattenedTrades } = useWallet()

  const walletQueryParams = useMemo(
    () => buildWalletQueryParams(activeWallets) || null,
    [activeWallets]
  )

  // Only the a./b. keys go to the API; wallet params are added by the hook.
  const filterQuery = useMemo(() => {
    const params = new URLSearchParams()
    searchParams.forEach((value, key) => {
      if (key.startsWith('a.') || key.startsWith('b.')) params.set(key, value)
    })
    return params.toString()
  }, [searchParams])

  const hasFilters = filterQuery.length > 0
  const { data, isLoading } = useCompareAnalytics(walletQueryParams, filterQuery)

  const clearAll = useCallback(() => {
    const params = new URLSearchParams()
    searchParams.forEach((value, key) => {
      if (!key.startsWith('a.') && !key.startsWith('b.')) params.set(key, value)
    })
    router.replace(`${pathname}${params.toString() ? `?${params}` : ''}`, { scroll: false })
  }, [router, pathname, searchParams])

  if (activeWallets.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-lg font-semibold">Compare</h1>
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <GitCompare className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium">No wallet selected</p>
            <p className="text-xs text-muted-foreground">
              Activate a wallet in Wallets to compare cohorts of your trades.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const money = (n: number) => formatValue(n)
  const pct = (n: number) => `${n}%`
  const num = (n: number) => String(n)
  const ratio = (n: number) => n.toFixed(2)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Compare</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Two filtered cohorts side by side. The URL holds both, so this view is
            shareable and the back button works.
          </p>
        </div>
        {hasFilters && (
          <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs" onClick={clearAll}>
            <X className="h-3 w-3" />
            Clear
          </Button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <CardContent className="p-4">
            <CohortFilters prefix="a." label="Cohort A" accent="bg-emerald-500" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <CohortFilters prefix="b." label="Cohort B" accent="bg-blue-500" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Results</CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          {isLoading && !data ? (
            <p className="py-6 text-center text-xs text-muted-foreground">Comparing…</p>
          ) : !data ? (
            <p className="py-6 text-center text-xs text-muted-foreground">
              {flattenedTrades.length === 0
                ? 'No trades yet — sync a wallet to compare.'
                : 'Set a filter on either cohort to compare.'}
            </p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[420px] text-xs">
                  <thead>
                    <tr className="border-b text-[10px] uppercase tracking-wide text-muted-foreground">
                      <th className="pb-1.5 text-left font-medium">Metric</th>
                      <th className="pb-1.5 text-right font-medium">
                        <span className="inline-flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />A
                        </span>
                      </th>
                      <th className="pb-1.5 text-right font-medium">
                        <span className="inline-flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />B
                        </span>
                      </th>
                      <th className="pb-1.5 text-right font-medium">B &minus; A</th>
                    </tr>
                  </thead>
                  <tbody>
                    <StatRow
                      label="Trades"
                      a={data.a.stats.totalTrades}
                      b={data.b.stats.totalTrades}
                      delta={data.delta.totalTrades}
                      format={num}
                      higherIsBetter
                    />
                    <StatRow
                      label="Net P/L"
                      a={data.a.stats.totalPnL}
                      b={data.b.stats.totalPnL}
                      delta={data.delta.totalPnL}
                      format={money}
                    />
                    <StatRow
                      label="Win rate"
                      a={data.a.stats.winRate}
                      b={data.b.stats.winRate}
                      delta={data.delta.winRate}
                      format={pct}
                    />
                    <StatRow
                      label="Profit factor"
                      a={data.a.stats.profitFactor}
                      b={data.b.stats.profitFactor}
                      delta={data.delta.profitFactor}
                      format={ratio}
                    />
                    <StatRow
                      label="Avg P/L"
                      a={data.a.stats.avgPnL}
                      b={data.b.stats.avgPnL}
                      delta={data.delta.avgPnL}
                      format={money}
                    />
                  </tbody>
                </table>
              </div>
              {(data.a.stats.totalTrades === 0 || data.b.stats.totalTrades === 0) && (
                <p className="mt-3 text-[11px] text-amber-500">
                  One cohort is empty — widen its filters for a meaningful comparison.
                </p>
              )}
              <p className="mt-2 text-[10px] text-muted-foreground">
                Filtered from {data.totalTrades} total trades.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

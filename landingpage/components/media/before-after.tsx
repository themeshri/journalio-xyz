import { FileSpreadsheet, TrendingDown } from 'lucide-react'
import { DeviceFrame } from './device-frame'
import { MockDashboard } from './mock-dashboard'

/** Messy hand-kept spreadsheet — deliberately misaligned, gaps, no totals. */
const MESSY_ROWS = [
  { date: '03/14', token: 'WIF', size: '0.8', pnl: '+142', note: 'good entry' },
  { date: '03/14', token: 'BONK', size: '', pnl: '', note: '???' },
  { date: '03/16', token: 'POPCAT', size: '1.2', pnl: '-310', note: '' },
  { date: '', token: 'WIF', size: '2.0', pnl: '-95', note: 'revenge?' },
  { date: '03/21', token: '', size: '', pnl: '', note: 'forgot to log' },
]

function BeforePanel() {
  return (
    <div className="overflow-hidden rounded-xl border border-red-500/25 bg-card">
      <div className="flex items-center gap-2 border-b border-red-500/20 bg-red-500/5 px-3 py-2">
        <FileSpreadsheet className="h-3.5 w-3.5 text-red-500" />
        <span className="text-[11px] font-medium text-muted-foreground">
          trades_final_v3_REAL.xlsx
        </span>
      </div>

      <div className="p-3">
        <div className="text-mono grid grid-cols-[2.2rem_3rem_1.7rem_2.5rem_1fr] gap-x-2 border-b pb-1.5 text-[9px] uppercase tracking-wide text-muted-foreground">
          <span>Date</span>
          <span>Token</span>
          <span>Sz</span>
          <span>P&amp;L</span>
          <span>Note</span>
        </div>

        {MESSY_ROWS.map((r, i) => (
          <div
            key={i}
            className="text-mono grid grid-cols-[2.2rem_3rem_1.7rem_2.5rem_1fr] gap-x-2 border-b border-dashed py-1.5 text-[10px] last:border-0"
          >
            <span className="text-muted-foreground">{r.date || '—'}</span>
            <span>{r.token || '—'}</span>
            <span className="text-muted-foreground">{r.size || '—'}</span>
            <span
              className={
                r.pnl.startsWith('-')
                  ? 'text-red-500'
                  : r.pnl
                    ? 'text-emerald-600'
                    : 'text-muted-foreground'
              }
            >
              {r.pnl || '?'}
            </span>
            <span className="truncate text-muted-foreground/70">{r.note}</span>
          </div>
        ))}

        <p className="mt-2.5 flex items-center gap-1.5 text-[10px] text-red-500">
          <TrendingDown className="h-3 w-3 shrink-0" />
          No totals. No cycles. Half the month missing.
        </p>
      </div>
    </div>
  )
}

/**
 * Side-by-side "what you have now" vs "what you get" — the hero's visual
 * argument. Stacks on mobile so neither panel gets unreadably narrow.
 */
export function BeforeAfter() {
  return (
    <div className="grid items-start gap-5 sm:grid-cols-2 sm:gap-4">
      <div className="flex flex-col">
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Before
        </p>
        <BeforePanel />
      </div>

      <div className="flex flex-col">
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-primary">
          After
        </p>
        <DeviceFrame className="shadow-xl">
          <MockDashboard />
        </DeviceFrame>
      </div>
    </div>
  )
}

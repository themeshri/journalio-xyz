import { Home, BookOpen, BarChart3, Target } from 'lucide-react'

/**
 * A believable Journalio dashboard rendered entirely in CSS/SVG — no image
 * asset needed. Used inside the hero device frame so the page looks polished
 * on day one. Numbers are illustrative, not claims.
 */
export function MockDashboard() {
  return (
    <div className="flex h-[360px] bg-background text-foreground sm:h-[420px]">
      {/* Icon rail */}
      <div className="hidden w-11 flex-col items-center gap-1 border-r bg-muted/30 py-3 sm:flex">
        {[Home, BookOpen, BarChart3, Target].map((Icon, i) => (
          <div
            key={i}
            className={`flex h-8 w-8 items-center justify-center rounded-md ${
              i === 0 ? 'bg-primary/15 text-primary' : 'text-muted-foreground'
            }`}
          >
            <Icon className="h-4 w-4" />
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Net P/L · all time
            </p>
            <p className="text-mono text-xl font-bold text-emerald-500">
              +$12,480
            </p>
          </div>
          <div className="rounded-md border bg-emerald-500/10 px-2 py-1 text-[10px] font-medium text-emerald-600">
            Synced 3m ago
          </div>
        </div>

        {/* Equity curve */}
        <div className="mb-3 rounded-lg border bg-card p-3">
          <p className="mb-1 text-[10px] font-medium text-muted-foreground">
            Equity curve
          </p>
          <svg viewBox="0 0 300 70" className="h-16 w-full" preserveAspectRatio="none">
            <defs>
              <linearGradient id="eq" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity="0.35" />
                <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity="0" />
              </linearGradient>
            </defs>
            <polyline
              points="0,55 30,50 60,52 90,40 120,44 150,30 180,34 210,22 240,26 270,14 300,10"
              fill="none"
              stroke="var(--color-chart-1)"
              strokeWidth="2"
            />
            <polygon
              points="0,55 30,50 60,52 90,40 120,44 150,30 180,34 210,22 240,26 270,14 300,10 300,70 0,70"
              fill="url(#eq)"
            />
          </svg>
        </div>

        {/* KPI mini row + calendar */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Win rate', value: '58%' },
            { label: 'Profit factor', value: '2.1' },
            { label: 'Discipline', value: '4/5' },
          ].map((k) => (
            <div key={k.label} className="rounded-lg border bg-card p-2">
              <p className="text-[9px] text-muted-foreground">{k.label}</p>
              <p className="text-mono text-sm font-semibold">{k.value}</p>
            </div>
          ))}
        </div>

        {/* Activity heatmap strip */}
        <div className="mt-3 flex gap-1">
          {Array.from({ length: 28 }).map((_, i) => {
            const lvl = [0, 1, 2, 3, 4, 5][i % 6]
            const bg = [
              'bg-muted',
              'bg-emerald-900/50',
              'bg-emerald-700/60',
              'bg-emerald-600/70',
              'bg-emerald-500/80',
              'bg-emerald-400',
            ][lvl]
            return <span key={i} className={`h-3.5 flex-1 rounded-[2px] ${bg}`} />
          })}
        </div>
      </div>
    </div>
  )
}

const STATS = [
  { value: '3', label: 'chains', sub: 'Solana · Base · BNB' },
  { value: '0', label: 'manual entry', sub: 'trades import from your wallet' },
  { value: '~5 min', label: 'sync', sub: 'trades refresh automatically' },
  { value: '0–5', label: 'daily score', sub: 'explainable discipline rating' },
]

const WORKS_WITH = ['Solana', 'Base', 'BNB', 'Jupiter', 'Axiom', 'GMGN']

export function StatStrip() {
  return (
    <section className="border-y bg-muted/30">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label} className="text-center md:text-left">
              <p className="text-mono text-3xl font-bold text-foreground">
                {s.value}
              </p>
              <p className="text-sm font-medium">{s.label}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{s.sub}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 border-t pt-6">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">
            Works with
          </span>
          {WORKS_WITH.map((w) => (
            <span key={w} className="text-sm font-medium text-muted-foreground">
              {w}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}

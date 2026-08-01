/**
 * A GitHub-style daily 0–5 discipline heatmap, rendered in pure CSS — an
 * authentic mini version of Journalio's activity calendar (no screenshot).
 */
const LEVELS = [
  'bg-muted',
  'bg-emerald-900/50',
  'bg-emerald-700/60',
  'bg-emerald-600/70',
  'bg-emerald-500/80',
  'bg-emerald-400',
]

// Deterministic pseudo-pattern so it looks lived-in without randomness.
function level(week: number, day: number) {
  return (week * 3 + day * 2 + (week % 4)) % 6
}

export function ActivityHeatmap() {
  const weeks = 20
  const days = 7
  return (
    <div className="rounded-xl border bg-card p-5 shadow-lg">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-medium">Activity</p>
        <p className="text-xs text-muted-foreground">19 active days</p>
      </div>
      <div className="flex gap-1">
        {Array.from({ length: weeks }).map((_, w) => (
          <div key={w} className="flex flex-col gap-1">
            {Array.from({ length: days }).map((_, d) => (
              <span
                key={d}
                className={`h-3 w-3 rounded-[2px] ${LEVELS[level(w, d)]}`}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-end gap-1.5 text-[10px] text-muted-foreground">
        Less
        {LEVELS.map((l, i) => (
          <span key={i} className={`h-3 w-3 rounded-[2px] ${l}`} />
        ))}
        More
      </div>
    </div>
  )
}

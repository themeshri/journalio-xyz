const COSTS = [
  {
    figure: '90 days',
    label: 'of the same leak',
    body: 'One unexamined habit, repeated every week for a quarter, compounds quietly.',
  },
  {
    figure: 'Every',
    label: 'untracked loss',
    body: 'A loss you never review is a lesson you paid for and threw away.',
  },
  {
    figure: '0',
    label: 'chance to improve',
    body: 'You cannot fix a pattern you have never actually seen written down.',
  },
]

export function CostOfInaction() {
  return (
    <section className="border-y bg-muted/30">
      <div className="mx-auto max-w-5xl px-4 py-20">
        <h2 className="max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
          Every month you don&apos;t look,{' '}
          <span className="text-red-500">you pay the same tuition twice.</span>
        </h2>
        <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
          Not knowing isn&apos;t neutral. It has a running cost, and it renews
          every single session you trade without a record.
        </p>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {COSTS.map((c) => (
            <div key={c.label} className="rounded-xl border bg-card p-6">
              <p className="text-mono text-3xl font-bold text-red-500">
                {c.figure}
              </p>
              <p className="mt-1 font-medium">{c.label}</p>
              <p className="mt-2 text-sm text-muted-foreground">{c.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

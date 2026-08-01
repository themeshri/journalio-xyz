import { Brain, Shuffle, Clock } from 'lucide-react'
import { SectionHeader } from './section-header'

const REASONS = [
  {
    icon: Shuffle,
    title: 'A swap is not a trade',
    body: 'One position is four buys and three sells. Your explorer shows seven rows and no P&L — so the result never gets counted.',
  },
  {
    icon: Brain,
    title: 'Recency writes the story',
    body: 'The last two sessions feel like the trend. A quarter of data says otherwise — but you have never had the quarter in one place.',
  },
  {
    icon: Clock,
    title: 'Logging competes with trading',
    body: 'Manual journals fail because they demand attention exactly when the market has all of it. So the worst days go unrecorded.',
  },
]

export function ProblemMechanism() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-20">
      <SectionHeader
        eyebrow="Why this keeps happening"
        title="It’s not discipline."
        accent="It’s missing data."
      />

      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {REASONS.map((r) => (
          <div key={r.title} className="rounded-xl border bg-card p-6">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10 text-red-500">
              <r.icon className="h-5 w-5" />
            </div>
            <h3 className="font-semibold">{r.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{r.body}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

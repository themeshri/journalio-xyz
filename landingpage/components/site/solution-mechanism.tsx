import { Layers, Tags, DollarSign } from 'lucide-react'
import { SectionHeader } from './section-header'

const MECHANISM = [
  {
    icon: Layers,
    title: 'See what a trade actually cost you',
    body: 'Scattered buys and sells get stitched into one position with a real entry, exit, and result — instead of seven confusing rows in an explorer.',
  },
  {
    icon: Tags,
    title: 'Watch the same mistake add up',
    body: 'Tag a trade as chased, oversized, or held too long. Tags are structured data, not notes — so they accumulate instead of sitting in a text field.',
  },
  {
    icon: DollarSign,
    title: 'Learn which habit is the expensive one',
    body: 'Your leaks get ranked by dollars lost, not how often they happen — so the costly one surfaces even if it only shows up twice a month.',
  },
]

export function SolutionMechanism() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-20">
      <SectionHeader
        eyebrow="How it’s different"
        title="Three things a spreadsheet"
        accent="structurally can’t do."
      />

      <div className="mt-12 space-y-4">
        {MECHANISM.map((m, i) => (
          <div
            key={m.title}
            className="flex flex-col gap-4 rounded-xl border bg-card p-6 sm:flex-row sm:items-start"
          >
            <div className="flex items-center gap-3 sm:w-44 sm:shrink-0">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <m.icon className="h-5 w-5" />
              </div>
              <span className="text-mono text-2xl font-bold text-muted-foreground/40">
                {String(i + 1).padStart(2, '0')}
              </span>
            </div>
            <div>
              <h3 className="font-semibold">{m.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{m.body}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

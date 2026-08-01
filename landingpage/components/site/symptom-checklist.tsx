import { Square } from 'lucide-react'
import { SectionHeader } from './section-header'

const SYMPTOMS = [
  'You can name your best trade this month but not your worst.',
  'You size up right after a loss to make it back faster.',
  'You have started a trading spreadsheet at least twice and abandoned both.',
  'Your win rate feels good but your balance disagrees.',
  'You hold losers longer than winners and know it.',
  'You have never once reviewed a full month of trades end to end.',
]

export function SymptomChecklist() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-20">
      <SectionHeader
        eyebrow="Quick self-check"
        title="How many of these"
        accent="sound familiar?"
      />

      <ul className="mt-10 space-y-3">
        {SYMPTOMS.map((s) => (
          <li
            key={s}
            className="flex items-start gap-3 rounded-xl border bg-card p-4"
          >
            <Square className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/50" />
            <span className="text-sm">{s}</span>
          </li>
        ))}
      </ul>

      <p className="mt-8 text-center text-lg font-medium">
        Three or more? The rest of this page is for you.
      </p>
    </section>
  )
}

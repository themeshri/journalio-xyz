import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SectionHeader } from './section-header'

const TIMELINE = [
  {
    when: 'Day 1',
    title: 'Your real numbers',
    body: 'Paste a wallet and your full history rebuilds in about a minute — usually enough to spot the biggest leak in one sitting.',
  },
  {
    when: 'Day 7',
    title: 'The pattern shows up',
    body: 'A week of tagged trades is enough for the same mistake to appear three times — which is when it stops feeling like bad luck.',
  },
  {
    when: 'Day 30',
    title: 'A number that moves',
    body: 'Your discipline score has a month of history. You can see whether the habit you set out to fix is actually improving.',
  },
]

export function TimeToResult() {
  return (
    <section className="border-y bg-muted/30">
      <div className="mx-auto max-w-5xl px-4 py-20">
        <SectionHeader
          eyebrow="What to expect"
          title="Where you’ll be"
          accent="in a month."
        />

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {TIMELINE.map((t) => (
            <div key={t.when} className="rounded-xl border bg-card p-6">
              <p className="text-mono text-sm font-bold uppercase tracking-wide text-primary">
                {t.when}
              </p>
              <h3 className="mt-2 font-semibold">{t.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{t.body}</p>
            </div>
          ))}
        </div>

        {/* Mid-page CTA — motivation peaks right after "Day 1: your real
            numbers", and the next hard ask would otherwise be ~1,500 words on. */}
        <div className="mt-10 text-center">
          <Button asChild size="lg">
            <a href="#early-access">
              Start with day 1 — paste your wallet
              <ArrowRight className="ml-2 h-4 w-4" />
            </a>
          </Button>
          <p className="mt-3 text-sm text-muted-foreground">
            Free while in beta · No card · Read-only
          </p>
        </div>
      </div>
    </section>
  )
}

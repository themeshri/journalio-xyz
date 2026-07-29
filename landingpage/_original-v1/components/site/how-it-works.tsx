import { Wallet, BookOpen, LineChart } from 'lucide-react'
import { SectionHeader } from './section-header'

const STEPS = [
  {
    icon: Wallet,
    title: 'Paste your wallet',
    body: 'Add a Solana or EVM address. Journalio imports your swaps and turns them into P&L trades — automatically.',
  },
  {
    icon: BookOpen,
    title: 'Trade & journal your sessions',
    body: 'Set a pre-session intent, trade your plan, then review the day. Tag mistakes and grade your trades.',
  },
  {
    icon: LineChart,
    title: 'Review what’s costing you',
    body: 'See your discipline score, the leaks ranked by dollar cost, and 50+ reports on what’s actually working.',
  },
]

export function HowItWorks() {
  return (
    <section id="how" className="border-y bg-muted/30">
      <div className="mx-auto max-w-6xl px-4 py-20">
        <SectionHeader
          eyebrow="How it works"
          title="From wallet to insight in"
          accent="three steps."
        />
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <div
              key={s.title}
              className="relative rounded-xl border bg-card p-6"
            >
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <s.icon className="h-5 w-5" />
                </div>
                <span className="text-mono text-2xl font-bold text-muted-foreground/40">
                  {String(i + 1).padStart(2, '0')}
                </span>
              </div>
              <h3 className="text-lg font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

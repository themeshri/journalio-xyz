import { Zap, Sheet, Target, Lock } from 'lucide-react'
import { SectionHeader } from './section-header'

const VALUES = [
  {
    icon: Zap,
    title: 'Built for on-chain speed',
    body: 'Memecoins, perps, high-frequency swaps — Journalio keeps up with how you actually trade on Solana and EVM.',
  },
  {
    icon: Sheet,
    title: 'No more spreadsheets',
    body: 'Stop copy-pasting fills. Your journal fills itself from the chain, so you spend your time reviewing, not logging.',
  },
  {
    icon: Target,
    title: 'Discipline over dopamine',
    body: 'Rules, streaks, and a daily score turn “I’ll do better” into something measurable you can improve.',
  },
  {
    icon: Lock,
    title: 'Your data stays yours',
    body: 'Read-only wallet addresses. No keys, no custody. Your trading history is yours to keep and export.',
  },
]

export function ValueProp() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20">
      <SectionHeader
        eyebrow="Why Journalio"
        title="Made for"
        accent="on-chain traders."
        subtitle="New and in active development — early users shape the roadmap."
      />
      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {VALUES.map((v) => (
          <div key={v.title} className="rounded-xl border bg-card p-6">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <v.icon className="h-5 w-5" />
            </div>
            <h3 className="font-semibold">{v.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{v.body}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

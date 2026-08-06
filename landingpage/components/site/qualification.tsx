import { SectionHeader } from './section-header'

const QUESTIONS = [
  {
    q: 'Do you trade on Solana, Base, or BNB?',
    a: 'Journalio reads those chains directly. If you trade somewhere else, it won’t help you yet.',
  },
  {
    q: 'Have you placed at least twenty trades?',
    a: 'Patterns need volume. Under twenty and there isn’t enough history for the reports to say anything useful.',
  },
  {
    q: 'Do you actually want to know the answer?',
    a: 'The first report is usually uncomfortable. It only helps if you’re willing to look at it.',
  },
]

export function Qualification() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-20">
      <SectionHeader
        eyebrow="Is this for you?"
        title="Three questions,"
        accent="honestly."
      />

      <div className="mt-12 space-y-4">
        {QUESTIONS.map((item, i) => (
          <div key={item.q} className="rounded-xl border bg-card p-6">
            <div className="flex items-start gap-4">
              <span className="text-mono text-2xl font-bold text-muted-foreground/40">
                {String(i + 1).padStart(2, '0')}
              </span>
              <div>
                <h3 className="font-semibold">{item.q}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{item.a}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-8 text-center text-lg font-medium">
        Three yeses? Paste a wallet. One no? Come back when it changes.
      </p>
    </section>
  )
}

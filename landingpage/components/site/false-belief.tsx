import { X, Check } from 'lucide-react'

export function FalseBelief() {
  return (
    <section className="border-y bg-muted/30">
      <div className="mx-auto max-w-3xl px-4 py-20">
        <div className="flex items-start gap-3">
          <X className="mt-2 h-6 w-6 shrink-0 text-red-500" />
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            &ldquo;I don&apos;t need a journal. I remember my trades.&rdquo;
          </h2>
        </div>

        <div className="mt-6 space-y-4 text-lg text-muted-foreground">
          <p>
            You probably do — individually. But leaks don&apos;t live in single
            trades. They live in the pattern across forty of them.
          </p>
          <p>
            No one recalls that eleven of their last thirty entries came within
            twenty minutes of a loss. That&apos;s arithmetic, and it needs a
            record.
          </p>
        </div>

        <div className="mt-8 flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5">
          <Check className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
          <p className="font-medium">
            A journal isn&apos;t for remembering trades. It&apos;s for counting
            them — which is the one thing memory can&apos;t do.
          </p>
        </div>
      </div>
    </section>
  )
}

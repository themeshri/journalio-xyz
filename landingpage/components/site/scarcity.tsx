import { Lock } from 'lucide-react'

/*
 * Scarcity is limited to what is verifiably true today: the beta is free and
 * paid plans are planned. No countdown timers, no invented seat counts.
 * If a real cap is ever enforced, state the number here — not before.
 */
export function Scarcity() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-20">
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-8 text-center sm:p-10">
        <div className="mx-auto mb-5 flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Lock className="h-5 w-5" />
        </div>

        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Free now. Not free later.
        </h2>

        <p className="mx-auto mt-4 max-w-lg text-muted-foreground">
          Journalio is free in beta, and everyone who joins now keeps free
          access after paid plans launch. That window closes the day we start
          charging.
        </p>
      </div>
    </section>
  )
}

import { Quote } from 'lucide-react'
import { SectionHeader } from './section-header'

/*
 * ─────────────────────────────────────────────────────────────────────────
 * TODO: REPLACE BEFORE LAUNCH
 *
 * EMPTY SCAFFOLD — no invented reviews. Same reasoning as ugc-wall.tsx:
 * fabricated testimonials are deceptive and legally exposed (FTC 16 CFR
 * Part 255). Do not fill these with plausible-sounding trader quotes.
 *
 * When real reviews exist, each SLOT becomes { quote, name, handle, avatar }.
 * Get written permission before publishing anyone's name or handle.
 * ─────────────────────────────────────────────────────────────────────────
 */

const SLOTS = [1, 2, 3]

export function Reviews() {
  return (
    <section className="border-y bg-muted/30">
      <div className="mx-auto max-w-5xl px-4 py-20">
        <SectionHeader
          eyebrow="Reviews"
          title="Straight from"
          accent="the first traders in."
          subtitle="Reviews go up here unedited once the beta cohort has a month of data behind them."
        />

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {SLOTS.map((s) => (
            <div
              key={s}
              className="rounded-xl border border-dashed bg-card/50 p-6"
            >
              <Quote className="h-5 w-5 text-muted-foreground/40" />
              <div className="mt-4 space-y-2">
                <div className="h-2.5 w-full rounded bg-muted" />
                <div className="h-2.5 w-11/12 rounded bg-muted" />
                <div className="h-2.5 w-8/12 rounded bg-muted" />
              </div>
              <div className="mt-6 flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-muted" />
                <div className="space-y-1.5">
                  <div className="h-2 w-20 rounded bg-muted" />
                  <div className="h-2 w-14 rounded bg-muted" />
                </div>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          No reviews yet — we&apos;d rather show you nothing than show you
          something we made up.
        </p>
      </div>
    </section>
  )
}

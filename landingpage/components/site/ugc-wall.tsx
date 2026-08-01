import { ImageIcon } from 'lucide-react'
import { SectionHeader } from './section-header'

/*
 * ─────────────────────────────────────────────────────────────────────────
 * TODO: REPLACE BEFORE LAUNCH
 *
 * This is an EMPTY SCAFFOLD. Journalio is pre-launch and has no users yet,
 * so there is deliberately no testimonial content here — placeholder tiles
 * only. Publishing invented user posts as real would be deceptive and, for
 * endorsements, illegal in most jurisdictions (FTC 16 CFR Part 255 in the US).
 *
 * When you have real material, replace TILES with actual screenshots/quotes
 * and get explicit permission from each person before publishing.
 *
 * Until then: keep this section out of `app/page.tsx`, or ship it as-is —
 * an honest "coming soon" reads better than a fake wall.
 * ─────────────────────────────────────────────────────────────────────────
 */

const TILES = [1, 2, 3, 4, 5, 6]

export function UgcWall() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-20">
      <SectionHeader
        eyebrow="From the beta"
        title="What early users"
        accent="are posting."
        subtitle="We're onboarding the first cohort now — this wall fills in as they share their results."
      />

      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TILES.map((t) => (
          <div
            key={t}
            className="flex aspect-[4/3] flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-muted/30 text-muted-foreground/50"
          >
            <ImageIcon className="h-6 w-6" />
            <span className="text-xs">Beta user post</span>
          </div>
        ))}
      </div>
    </section>
  )
}

import { SectionHeader } from './section-header'
import { FeatureRow, type FeatureContent } from './feature-row'
import { ScreenshotSlot } from '@/components/media/screenshot-slot'
import { ActivityHeatmap } from '@/components/media/activity-heatmap'

/**
 * The six core feature blocks. Drop real screenshots at the `screenshot`
 * paths below (public/screenshots/*.png); until then each shows a captioned
 * placeholder. Feature #6 renders a real CSS heatmap instead of an image.
 */
const FEATURES: FeatureContent[] = [
  {
    eyebrow: 'Auto-Import Journal',
    title: 'Every swap, journaled automatically.',
    body: 'Paste a Solana or EVM wallet once. Journalio turns your on-chain swaps into clean P&L trade cycles — no manual entry, ever.',
    bullets: [
      'Solana + EVM (Base & BNB)',
      'P&L cycles derived from your swaps',
      'Per-trade notes & foldered journals',
      'Resync anytime — trades stay current',
    ],
    screenshot: '/screenshots/auto-import.png',
  },
  {
    eyebrow: 'Pre / Post-Session Loop',
    title: 'Close the feedback loop.',
    body: 'Set your intent before the session, review how it went after. Pre-Session → Trade → Post-Session — the loop that actually builds skill.',
    bullets: [
      'Pre-session checklist to set intentions',
      'Post-session review and day rating',
      'Session-scoped stats and journals',
      'A repeatable daily ritual',
    ],
    screenshot: '/screenshots/sessions.png',
  },
  {
    eyebrow: 'Rules & Discipline',
    title: 'Turn your plan into a score.',
    body: 'Define typed rules — start on time, cap your loss, link every trade to a strategy — and get a daily follow-rate, streaks, and an explainable 0–5 score.',
    bullets: [
      'Typed rules: time, max-loss, count, %',
      'Daily follow-rate and streaks',
      'Explainable 0–5 activity score',
      'Progress tracker with a real history',
    ],
    screenshot: '/screenshots/rules.png',
  },
  {
    eyebrow: 'Mistake-Cost Tags',
    title: 'See what’s costing you money.',
    body: 'Tag trades with the mistakes you actually make — entered too early, chased the pump, moved your stop — and rank them by dollar cost, not frequency.',
    bullets: [
      'Mistake vs. custom tag namespaces',
      'Ranked by $ cost, not count',
      'Spot the leaks that quietly add up',
      'Learn from patterns, not vibes',
    ],
    screenshot: '/screenshots/mistakes.png',
  },
  {
    id: 'analytics',
    eyebrow: 'Analytics & Reports',
    title: '50+ reports on your trading.',
    body: 'Win rate, profit factor, drawdown, equity curve, time-of-day and duration analysis, behavior, cohort comparison, and a P&L calendar — all automatic.',
    bullets: [
      'Equity curve, drawdown & profit factor',
      'Time / duration / behavior analysis',
      'Compare two cohorts side by side',
      'P&L calendar with weekly summaries',
    ],
    screenshot: '/screenshots/analytics.png',
  },
  {
    eyebrow: 'Activity Calendar',
    title: 'Build the habit, one day at a time.',
    body: 'A GitHub-style heatmap scores each trading day 0–5 — traded, pre-session, post-session, journaled, rules followed — so consistency becomes something you can see.',
    bullets: [
      'Daily 0–5 discipline score',
      'Each point is explainable',
      'Streaks you won’t want to break',
      'Consistency you can actually see',
    ],
    media: <ActivityHeatmap />,
  },
]

export function Features() {
  return (
    <section id="features" className="mx-auto max-w-6xl px-4 py-20">
      <SectionHeader
        eyebrow="All your tools"
        title="Six features."
        accent="One loop."
        subtitle="Everything that makes you a sharper on-chain trader — and nothing that doesn’t."
      />
      <div className="mt-8 divide-y">
        {FEATURES.map((f, i) => (
          <FeatureRow key={f.title} content={f} reverse={i % 2 === 1}>
            {f.media ?? (
              <ScreenshotSlot src={f.screenshot} caption={`${f.eyebrow} — screenshot`} />
            )}
          </FeatureRow>
        ))}
      </div>
    </section>
  )
}

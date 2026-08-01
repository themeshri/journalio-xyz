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
    title: 'The routine that actually builds skill.',
    body: 'Set your intent before you trade, then review the day after. It’s the simple loop — plan, trade, review — that separates traders who improve from traders who just churn.',
    bullets: [
      'Set intentions before the session',
      'Rate and review the day after',
      'Session-scoped stats and journals',
      'A ritual you’ll actually keep',
    ],
    screenshot: '/screenshots/sessions.png',
  },
  {
    eyebrow: 'Rules & Discipline',
    title: 'Turn your trading plan into a score.',
    body: 'Set your rules — start on time, cap your loss per trade, link every trade to a strategy — and Journalio grades how well you followed them, every single day.',
    bullets: [
      'Rules for start time, max loss, and more',
      'A daily follow-rate and win streaks',
      'An explainable 0–5 discipline score',
      'A progress tracker with real history',
    ],
    screenshot: '/screenshots/rules.png',
  },
  {
    eyebrow: 'Mistake-Cost Tags',
    title: 'See exactly what’s costing you money.',
    body: 'Tag the mistakes you actually make — chased the pump, moved my stop, entered too early — and Journalio ranks them by how many dollars each one cost you this month.',
    bullets: [
      'Tag “chased the pump”, “moved my stop”…',
      'Ranked by dollars lost, not frequency',
      'Find the leaks that quietly add up',
      'Fix patterns instead of guessing',
    ],
    screenshot: '/screenshots/mistakes.png',
  },
  {
    id: 'analytics',
    eyebrow: 'Analytics & Reports',
    title: '50+ reports that answer “why am I losing?”',
    body: 'Win rate, profit factor, drawdown, equity curve, time-of-day and hold-time analysis, a P&L calendar — all built automatically from your on-chain trades.',
    bullets: [
      'Equity curve, drawdown & profit factor',
      'Time-of-day and hold-time analysis',
      'Compare two sets of trades side by side',
      'A P&L calendar with weekly totals',
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
        title="Six ways Journalio makes you a"
        accent="sharper trader."
        subtitle="Import, review, and find your leaks — everything you need to stop trading on tilt, and nothing you don’t."
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

import { SectionHeader } from './section-header'
import { ScreenshotSlot } from '@/components/media/screenshot-slot'

export function Overview() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20">
      <SectionHeader
        eyebrow="Everything in one place"
        title="One hub for your whole"
        accent="trading loop."
        subtitle="Import, journal, review, and analyze — without leaving the app or opening a spreadsheet."
      />
      <div className="mx-auto mt-12 max-w-5xl">
        <ScreenshotSlot
          src="/screenshots/overview.png"
          caption="Dashboard overview — drop overview.png here"
        />
      </div>
    </section>
  )
}

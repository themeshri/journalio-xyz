import { ArrowRight, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface FeatureContent {
  eyebrow: string
  title: string
  body: string
  bullets: string[]
  /** Path under public/, e.g. "/screenshots/auto-import.png". */
  screenshot?: string
  /** Custom media (e.g. the CSS activity heatmap) instead of a screenshot. */
  media?: React.ReactNode
  id?: string
}

/** One alternating 2-column feature block: copy on one side, media on the other. */
export function FeatureRow({
  content,
  reverse,
  children,
}: {
  content: FeatureContent
  reverse?: boolean
  /** The media node (ScreenshotSlot or custom) supplied by the parent. */
  children: React.ReactNode
}) {
  return (
    <div
      id={content.id}
      className="grid items-center gap-10 py-14 lg:grid-cols-2 lg:gap-16"
    >
      <div className={cn(reverse && 'lg:order-2')}>
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-primary">
          {content.eyebrow}
        </p>
        <h3 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {content.title}
        </h3>
        <p className="mt-4 text-muted-foreground">{content.body}</p>
        <ul className="mt-6 space-y-2.5">
          {content.bullets.map((b) => (
            <li key={b} className="flex items-start gap-2.5 text-sm">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
              <span>{b}</span>
            </li>
          ))}
        </ul>
        <a
          href="#early-access"
          className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          Learn more <ArrowRight className="h-3.5 w-3.5" />
        </a>
      </div>

      <div className={cn(reverse && 'lg:order-1')}>{children}</div>
    </div>
  )
}

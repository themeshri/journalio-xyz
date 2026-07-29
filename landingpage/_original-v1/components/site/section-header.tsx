import { cn } from '@/lib/utils'

/** Centered eyebrow + two-line headline + subhead, reused across sections. */
export function SectionHeader({
  eyebrow,
  title,
  accent,
  subtitle,
  className,
}: {
  eyebrow?: string
  title: string
  accent?: string
  subtitle?: string
  className?: string
}) {
  return (
    <div className={cn('mx-auto max-w-2xl text-center', className)}>
      {eyebrow && (
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-primary">
          {eyebrow}
        </p>
      )}
      <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
        {title}
        {accent && <span className="text-primary"> {accent}</span>}
      </h2>
      {subtitle && (
        <p className="mt-4 text-lg text-muted-foreground">{subtitle}</p>
      )}
    </div>
  )
}

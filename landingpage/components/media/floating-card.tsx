import { cn } from '@/lib/utils'

/**
 * A small glass card floated over the hero device to reinforce a story
 * (e.g. "auto-import successful", "discipline 4/5").
 */
export function FloatingCard({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'rounded-xl border bg-card/90 p-3 shadow-xl backdrop-blur-sm',
        className
      )}
    >
      {children}
    </div>
  )
}

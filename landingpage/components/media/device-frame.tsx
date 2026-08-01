import { cn } from '@/lib/utils'

/**
 * A browser/app-window chrome wrapper around any media — three dots + a faux
 * address bar — so screenshots and the CSS mock read as "a real product".
 */
export function DeviceFrame({
  children,
  url = 'app.journalio.xyz',
  className,
}: {
  children: React.ReactNode
  url?: string
  className?: string
}) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border bg-card shadow-2xl',
        className
      )}
    >
      <div className="flex items-center gap-2 border-b bg-muted/40 px-3 py-2">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
        </div>
        <div className="mx-auto flex max-w-[60%] items-center gap-1.5 rounded-md bg-background/60 px-2.5 py-1 text-[11px] text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          {url}
        </div>
      </div>
      {children}
    </div>
  )
}

'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

/**
 * Route-level error boundary for all dashboard pages. Catches render/data
 * errors that the client-side <ErrorBoundary> in the root layout would miss
 * for Server Components, keeping the sidebar/layout intact while showing a
 * recoverable error state.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Dashboard route error:', error)
  }, [error])

  return (
    <div
      className="min-h-[400px] flex items-center justify-center p-8"
      role="alert"
      aria-live="assertive"
    >
      <div className="max-w-lg w-full rounded-lg border border-destructive/30 bg-destructive/5 p-6">
        <h2 className="text-lg font-semibold text-foreground mb-2">
          Something went wrong
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          This page failed to load. You can try again, or refresh if the problem
          persists.
        </p>
        {process.env.NODE_ENV === 'development' && (
          <details className="mb-4 text-xs">
            <summary className="cursor-pointer text-muted-foreground font-medium hover:text-foreground">
              Error details (development only)
            </summary>
            <pre className="mt-2 p-3 bg-muted rounded text-foreground overflow-auto">
              {error.message}
              {error.stack ? `\n\n${error.stack}` : ''}
            </pre>
          </details>
        )}
        <Button onClick={reset} variant="default" size="sm">
          Try again
        </Button>
      </div>
    </div>
  )
}

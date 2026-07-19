'use client'

import { useEffect } from 'react'

/**
 * Catches errors thrown in the root layout itself. When this fires it REPLACES
 * the root layout (including globals.css / providers), so it must render its own
 * <html>/<body> and cannot rely on Tailwind tokens or the theme — styles are
 * inlined and default to the app's dark aesthetic.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Global (root layout) error:', error)
  }, [error])

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          background: '#09090b',
          color: '#e4e4e7',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        <div
          role="alert"
          style={{
            maxWidth: '32rem',
            width: '100%',
            border: '1px solid #7f1d1d',
            background: 'rgba(127, 29, 29, 0.2)',
            borderRadius: '0.5rem',
            padding: '1.5rem',
          }}
        >
          <h1 style={{ fontSize: '1.125rem', fontWeight: 600, margin: '0 0 0.5rem' }}>
            Something went wrong
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#a1a1aa', margin: '0 0 1rem' }}>
            The application failed to load. Please try again.
          </p>
          <button
            onClick={reset}
            style={{
              padding: '0.5rem 1rem',
              fontSize: '0.875rem',
              fontWeight: 500,
              color: '#fff',
              background: '#dc2626',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}

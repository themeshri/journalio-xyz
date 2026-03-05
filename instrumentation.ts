export async function register() {
  // Validate environment variables on startup (all runtimes)
  const { validateEnv } = await import('./lib/env')
  validateEnv()

  if (process.env.NODE_ENV === 'production') {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
      await import('./sentry.server.config')
    }

    if (process.env.NEXT_RUNTIME === 'edge') {
      await import('./sentry.edge.config')
    }
  }
}

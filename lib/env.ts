/**
 * Validates required environment variables at startup.
 * Import this in instrumentation.ts to fail fast on misconfiguration.
 */

const required = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'DATABASE_URL',
] as const

const optional = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'SOLANA_TRACKER_API_KEY',
  'ZERION_API_KEY',
  'DIRECT_URL',
] as const

export function validateEnv() {
  const missing: string[] = []

  for (const key of required) {
    if (!process.env[key]) {
      missing.push(key)
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables:\n  ${missing.join('\n  ')}\n\nSee .env.example for required configuration.`
    )
  }

  // Warn about missing optional vars that affect functionality
  for (const key of optional) {
    if (!process.env[key]) {
      console.warn(`[env] Optional variable ${key} is not set — some features may be unavailable`)
    }
  }
}

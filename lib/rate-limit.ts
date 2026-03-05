import { NextRequest, NextResponse } from 'next/server'

interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

// Periodically clean expired entries to prevent memory leaks
const CLEANUP_INTERVAL = 60_000
let lastCleanup = Date.now()

function cleanup() {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return
  lastCleanup = now
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key)
  }
}

/**
 * Simple in-memory rate limiter for serverless.
 * Each Vercel instance maintains its own store — this provides
 * per-instance protection which is sufficient for proxy abuse and
 * brute-force mitigation.
 */
export function rateLimit(opts: {
  /** Max requests allowed in the window */
  limit: number
  /** Window size in seconds */
  windowSeconds: number
  /** Key prefix to namespace different limiters */
  prefix: string
}) {
  return function check(request: NextRequest): NextResponse | null {
    cleanup()

    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown'
    const key = `${opts.prefix}:${ip}`
    const now = Date.now()
    const entry = store.get(key)

    if (!entry || now > entry.resetAt) {
      store.set(key, { count: 1, resetAt: now + opts.windowSeconds * 1000 })
      return null
    }

    entry.count++
    if (entry.count > opts.limit) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000)
      return NextResponse.json(
        { error: 'Too many requests' },
        {
          status: 429,
          headers: { 'Retry-After': String(retryAfter) },
        }
      )
    }

    return null
  }
}

/**
 * Per-user rate limiter (uses userId instead of IP).
 */
export function rateLimitByUser(opts: {
  limit: number
  windowSeconds: number
  prefix: string
}) {
  return function check(userId: string): NextResponse | null {
    cleanup()

    const key = `${opts.prefix}:${userId}`
    const now = Date.now()
    const entry = store.get(key)

    if (!entry || now > entry.resetAt) {
      store.set(key, { count: 1, resetAt: now + opts.windowSeconds * 1000 })
      return null
    }

    entry.count++
    if (entry.count > opts.limit) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000)
      return NextResponse.json(
        { error: 'Too many requests' },
        {
          status: 429,
          headers: { 'Retry-After': String(retryAfter) },
        }
      )
    }

    return null
  }
}

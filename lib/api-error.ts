import { NextResponse } from 'next/server'

/**
 * Standard API error response for route handler `catch` blocks.
 *
 * Reproduces the exact copy-pasted pattern used across all API routes:
 *   1. Log the full error server-side (details never leak to the client).
 *   2. Return a generic client-facing message with the given status.
 *
 * Each route passes its own message so client-visible error text is
 * unchanged from the pre-refactor per-handler strings.
 *
 * Usage:
 *   } catch (error) {
 *     return handleApiError(error, 'Failed to fetch notes')
 *   }
 *
 * @param error    the caught error (logged server-side only)
 * @param message  generic client-facing message, e.g. "Failed to save note"
 * @param status   HTTP status (default 500)
 */
export function handleApiError(
  error: unknown,
  message: string,
  status = 500
): NextResponse {
  console.error(`${message}:`, error)
  return NextResponse.json({ error: message }, { status })
}

/**
 * Timezone-aware trading day calculation.
 * A "trading day" starts at the user's configured tradingStartTime in their timezone.
 * If the current time is before the start time, the trading day is the previous calendar day.
 */

const dateFormatter = new Map<string, Intl.DateTimeFormat>()

function getFormatter(timezone: string): Intl.DateTimeFormat {
  if (!dateFormatter.has(timezone)) {
    dateFormatter.set(
      timezone,
      new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      })
    )
  }
  return dateFormatter.get(timezone)!
}

function getTimeFormatter(timezone: string): Intl.DateTimeFormat {
  const key = `time_${timezone}`
  if (!dateFormatter.has(key)) {
    dateFormatter.set(
      key,
      new Intl.DateTimeFormat('en-GB', {
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
    )
  }
  return dateFormatter.get(key)!
}

/**
 * Returns the current trading day as YYYY-MM-DD in the user's timezone.
 * If the current time is before tradingStartTime, returns yesterday's date.
 */
export function getTradingDay(timezone: string = 'UTC', tradingStartTime: string = '09:00'): string {
  const now = new Date()
  const currentTime = getTimeFormatter(timezone).format(now) // "HH:mm"
  const currentDate = getFormatter(timezone).format(now) // "YYYY-MM-DD"

  if (currentTime < tradingStartTime) {
    // Before trading start — still "yesterday" in trading terms
    const yesterday = new Date(now.getTime() - 86400000)
    return getFormatter(timezone).format(yesterday)
  }

  return currentDate
}

/**
 * Returns the current calendar date in the user's timezone (ignoring trading start time).
 * Useful for displaying the actual date.
 */
export function getCalendarDate(timezone: string = 'UTC'): string {
  return getFormatter(timezone).format(new Date())
}

/**
 * Formats a Date as "HH:mm" in the given timezone.
 *
 * Exported for the rule engine (lib/rules-engine.ts), which reports the
 * observed clock time of a trader's first trade for the "09:26 / 09:30"
 * actual-vs-condition display.
 */
export function formatTimeInZone(date: Date, timezone: string = 'UTC'): string {
  return getTimeFormatter(timezone).format(date)
}

/**
 * Server-side version: computes the trading day for a given Date object.
 */
export function getTradingDayForDate(date: Date, timezone: string = 'UTC', tradingStartTime: string = '09:00'): string {
  const currentTime = getTimeFormatter(timezone).format(date)
  const currentDate = getFormatter(timezone).format(date)

  if (currentTime < tradingStartTime) {
    const yesterday = new Date(date.getTime() - 86400000)
    return getFormatter(timezone).format(yesterday)
  }

  return currentDate
}

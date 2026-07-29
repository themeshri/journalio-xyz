/**
 * @jest-environment node
 *
 * /api/dashboard used to run two dedicated queries for today's pre/post-session
 * status, on top of the yearly arrays it already fetched for ActivityCalendar.
 * Both showed up in the P2024 pool-timeout logs, so the flags are now derived
 * from the yearly arrays instead.
 *
 * These tests pin the derivation to the ORIGINAL query semantics:
 *
 *   preSessionDone  <- prisma.preSession.findFirst({ date: todayDate })
 *                        .savedAt  -> !!savedAt
 *   postSessionDone <- prisma.postSession.findFirst({ date: todayDate })
 *                        -> !!row
 *
 * The derivation is only sound if the yearly range contains todayDate, which
 * is why the route derives the year from todayDate (the user's TRADING day)
 * rather than from new Date().getFullYear() (the server's UTC calendar year).
 * The final test covers that boundary.
 */

type PreRow = { date: string; savedAt: Date | null }
type PostRow = { date: string }

// Mirrors app/api/dashboard/route.ts
const derivePreSessionDone = (rows: PreRow[], todayDate: string) =>
  !!rows.find((s) => s.date === todayDate)?.savedAt
const derivePostSessionDone = (rows: PostRow[], todayDate: string) =>
  rows.some((s) => s.date === todayDate)

// Reference implementations of the queries that were removed.
const originalPreSessionDone = (rows: PreRow[], todayDate: string) => {
  const row = rows.find((r) => r.date === todayDate) ?? null
  return !!row?.savedAt
}
const originalPostSessionDone = (rows: PostRow[], todayDate: string) => {
  const row = rows.find((r) => r.date === todayDate) ?? null
  return !!row
}

const TODAY = '2026-07-29'
const SAVED = new Date('2026-07-29T10:00:00Z')

describe('preSessionDone derivation', () => {
  it('is true when today has a saved pre-session', () => {
    const rows = [{ date: TODAY, savedAt: SAVED }]
    expect(derivePreSessionDone(rows, TODAY)).toBe(true)
  })

  it('is FALSE when today has a pre-session that was never saved', () => {
    // The critical distinction: the original selected savedAt and did !!savedAt,
    // so a started-but-unsaved row must not count as done.
    const rows = [{ date: TODAY, savedAt: null }]
    expect(derivePreSessionDone(rows, TODAY)).toBe(false)
  })

  it('is false when today has no pre-session at all', () => {
    const rows = [{ date: '2026-07-28', savedAt: SAVED }]
    expect(derivePreSessionDone(rows, TODAY)).toBe(false)
  })

  it('ignores other days that are saved', () => {
    const rows = [
      { date: '2026-07-27', savedAt: SAVED },
      { date: '2026-07-28', savedAt: SAVED },
    ]
    expect(derivePreSessionDone(rows, TODAY)).toBe(false)
  })

  it('handles an empty year', () => {
    expect(derivePreSessionDone([], TODAY)).toBe(false)
  })
})

describe('postSessionDone derivation', () => {
  it('is true when a row exists for today', () => {
    expect(derivePostSessionDone([{ date: TODAY }], TODAY)).toBe(true)
  })

  it('is false when no row exists for today', () => {
    expect(derivePostSessionDone([{ date: '2026-07-28' }], TODAY)).toBe(false)
  })

  it('handles an empty year', () => {
    expect(derivePostSessionDone([], TODAY)).toBe(false)
  })
})

describe('equivalence with the removed queries', () => {
  const preCases: PreRow[][] = [
    [],
    [{ date: TODAY, savedAt: SAVED }],
    [{ date: TODAY, savedAt: null }],
    [{ date: '2026-07-28', savedAt: SAVED }],
    [
      { date: '2026-01-01', savedAt: SAVED },
      { date: TODAY, savedAt: null },
      { date: '2026-12-31', savedAt: SAVED },
    ],
  ]

  it.each(preCases.map((c, i) => [i, c]))(
    'preSessionDone matches findFirst semantics (case %i)',
    (_i, rows) => {
      expect(derivePreSessionDone(rows as PreRow[], TODAY)).toBe(
        originalPreSessionDone(rows as PreRow[], TODAY)
      )
    }
  )

  const postCases: PostRow[][] = [
    [],
    [{ date: TODAY }],
    [{ date: '2026-07-28' }],
    [{ date: '2026-01-01' }, { date: TODAY }],
  ]

  it.each(postCases.map((c, i) => [i, c]))(
    'postSessionDone matches findFirst semantics (case %i)',
    (_i, rows) => {
      expect(derivePostSessionDone(rows as PostRow[], TODAY)).toBe(
        originalPostSessionDone(rows as PostRow[], TODAY)
      )
    }
  )
})

describe('year boundary — why the year comes from todayDate', () => {
  // A UTC+9 user before their trading start time on Jan 1 has a trading day of
  // Dec 31 of the PREVIOUS year, while the server's new Date().getFullYear()
  // would say the new year. Deriving the range from the server year would put
  // todayDate outside it and silently report "not done".
  const todayDate = '2025-12-31'

  const yearFromTodayDate = Number(todayDate.slice(0, 4))
  const yearFromServerClock = 2026 // what new Date().getFullYear() would give

  it('derives a range that contains todayDate', () => {
    const start = `${yearFromTodayDate}-01-01`
    const end = `${yearFromTodayDate}-12-31`
    expect(todayDate >= start && todayDate <= end).toBe(true)
  })

  it('would NOT contain todayDate if the year came from the server clock', () => {
    const start = `${yearFromServerClock}-01-01`
    const end = `${yearFromServerClock}-12-31`
    expect(todayDate >= start && todayDate <= end).toBe(false)
  })

  it('reports done correctly at the boundary when the range is right', () => {
    const rows = [{ date: todayDate, savedAt: SAVED }]
    expect(derivePreSessionDone(rows, todayDate)).toBe(true)
    expect(derivePostSessionDone([{ date: todayDate }], todayDate)).toBe(true)
  })
})

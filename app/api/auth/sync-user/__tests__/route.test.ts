/**
 * @jest-environment node
 *
 * Tests for POST /api/auth/sync-user.
 *
 * Covers the three defects this route was rewritten to fix:
 *   1. A malformed/empty body returned 500 (SyntaxError caught by the generic
 *      handler). It must return 400.
 *   2. Check-then-act (findUnique -> findUnique -> create) raced under
 *      concurrency, producing P2002 on `id`. It must upsert atomically and
 *      recover if it still loses a race inside Postgres.
 *   3. The email fallback — a user whose Supabase id changed but whose email
 *      did not must be updated in place, never duplicated.
 */
import { NextRequest } from 'next/server'
import { Prisma } from '@prisma/client'

const mockUser = {
  findUnique: jest.fn(),
  upsert: jest.fn(),
}
const mockUserSettings = { upsert: jest.fn() }

jest.mock('@/lib/prisma', () => ({
  prisma: {
    get user() {
      return mockUser
    },
    get userSettings() {
      return mockUserSettings
    },
  },
}))

// Rate limiter: never limit during tests.
jest.mock('@/lib/rate-limit', () => ({
  rateLimit: () => () => null,
}))

const mockGetUser = jest.fn()
jest.mock('@supabase/ssr', () => ({
  createServerClient: () => ({ auth: { getUser: mockGetUser } }),
}))

import { POST } from '../route'

const AUTH_ID = 'auth-user-id'
const EMAIL = 'trader@example.com'

function req(body: unknown, { raw = false }: { raw?: boolean } = {}) {
  return new NextRequest('https://app.journalio.xyz/api/auth/sync-user', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: raw ? (body as string) : JSON.stringify(body),
  })
}

describe('POST /api/auth/sync-user', () => {
  let errSpy: jest.SpyInstance

  beforeEach(() => {
    jest.clearAllMocks()
    errSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    mockGetUser.mockResolvedValue({ data: { user: { id: AUTH_ID } } })
    mockUser.findUnique.mockResolvedValue(null)
    mockUserSettings.upsert.mockResolvedValue({})
  })
  afterEach(() => errSpy.mockRestore())

  describe('body validation (was returning 500)', () => {
    it('returns 400 on malformed JSON, not 500', async () => {
      const res = await POST(req('{"bad":', { raw: true }))
      expect(res.status).toBe(400)
      expect(await res.json()).toEqual({ error: 'Invalid JSON body' })
    })

    it('returns 400 on an empty body, not 500', async () => {
      const res = await POST(req('', { raw: true }))
      expect(res.status).toBe(400)
    })

    it('returns 400 when email is missing', async () => {
      const res = await POST(req({ id: AUTH_ID }))
      expect(res.status).toBe(400)
      expect((await res.json()).error).toMatch(/email/)
    })

    it('returns 400 when email is not a valid address', async () => {
      const res = await POST(req({ id: AUTH_ID, email: 'not-an-email' }))
      expect(res.status).toBe(400)
      expect((await res.json()).error).toMatch(/valid email/)
    })

    it('rejects a bad body before touching the database', async () => {
      await POST(req({ id: AUTH_ID }))
      expect(mockUser.upsert).not.toHaveBeenCalled()
      expect(mockUser.findUnique).not.toHaveBeenCalled()
    })
  })

  describe('auth guards', () => {
    it('returns 401 when there is no Supabase session', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } })
      const res = await POST(req({ id: AUTH_ID, email: EMAIL }))
      expect(res.status).toBe(401)
      expect(mockUser.upsert).not.toHaveBeenCalled()
    })

    it('returns 403 when the body id does not match the session', async () => {
      const res = await POST(req({ id: 'someone-else', email: EMAIL }))
      expect(res.status).toBe(403)
      expect(mockUser.upsert).not.toHaveBeenCalled()
    })
  })

  describe('upsert', () => {
    it('creates a new user keyed on the session id', async () => {
      const created = { id: AUTH_ID, email: EMAIL, name: 'trader' }
      mockUser.upsert.mockResolvedValue(created)

      const res = await POST(req({ id: AUTH_ID, email: EMAIL }))

      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({ user: created })
      expect(mockUser.upsert).toHaveBeenCalledTimes(1)
      const arg = mockUser.upsert.mock.calls[0][0]
      expect(arg.where).toEqual({ id: AUTH_ID })
      expect(arg.create.email).toBe(EMAIL)
      // Falls back to the local-part of the email when no name is supplied.
      expect(arg.create.name).toBe('trader')
    })

    it('keys the upsert on id, never on the nullable email column', async () => {
      mockUser.upsert.mockResolvedValue({ id: AUTH_ID, email: EMAIL })
      await POST(req({ id: AUTH_ID, email: EMAIL }))
      const arg = mockUser.upsert.mock.calls[0][0]
      expect(arg.where).not.toHaveProperty('email')
      expect(Object.keys(arg.where)).toEqual(['id'])
    })

    it('targets the existing row when another user already owns the email', async () => {
      // The email-fallback case: Supabase id changed, email did not.
      const EXISTING_ID = 'older-db-id'
      mockUser.findUnique.mockResolvedValue({ id: EXISTING_ID })
      mockUser.upsert.mockResolvedValue({ id: EXISTING_ID, email: EMAIL })

      await POST(req({ id: AUTH_ID, email: EMAIL }))

      const arg = mockUser.upsert.mock.calls[0][0]
      // Must update the pre-existing row, not create a duplicate under the new id.
      expect(arg.where).toEqual({ id: EXISTING_ID })
      // And must NOT rewrite the id — that would cascade to every FK.
      expect(arg.update).not.toHaveProperty('id')
    })

    it('does not clobber a stored name/image with undefined', async () => {
      mockUser.upsert.mockResolvedValue({ id: AUTH_ID, email: EMAIL })
      await POST(req({ id: AUTH_ID, email: EMAIL }))
      const { update } = mockUser.upsert.mock.calls[0][0]
      expect(update).not.toHaveProperty('name')
      expect(update).not.toHaveProperty('image')
    })

    it('applies name and image when they are supplied', async () => {
      mockUser.upsert.mockResolvedValue({ id: AUTH_ID, email: EMAIL })
      await POST(
        req({ id: AUTH_ID, email: EMAIL, name: 'Hoss', image: 'https://x/y.png' })
      )
      const { update } = mockUser.upsert.mock.calls[0][0]
      expect(update.name).toBe('Hoss')
      expect(update.image).toBe('https://x/y.png')
    })
  })

  describe('settings', () => {
    it('upserts settings idempotently for an existing user missing them', async () => {
      mockUser.upsert.mockResolvedValue({ id: AUTH_ID, email: EMAIL })
      await POST(req({ id: AUTH_ID, email: EMAIL }))

      expect(mockUserSettings.upsert).toHaveBeenCalledWith({
        where: { userId: AUTH_ID },
        update: {},
        create: { userId: AUTH_ID },
      })
    })

    it('scopes settings to the resolved row, not the incoming session id', async () => {
      const EXISTING_ID = 'older-db-id'
      mockUser.findUnique.mockResolvedValue({ id: EXISTING_ID })
      mockUser.upsert.mockResolvedValue({ id: EXISTING_ID, email: EMAIL })

      await POST(req({ id: AUTH_ID, email: EMAIL }))

      expect(mockUserSettings.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: EXISTING_ID } })
      )
    })
  })

  describe('concurrency (the P2002 race)', () => {
    it('recovers when it loses a race inside Postgres', async () => {
      const winner = { id: 'winner-id', email: EMAIL }
      mockUser.upsert.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: '6.16.3',
        })
      )
      // First call (email resolution) misses; second (recovery) finds the winner.
      mockUser.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(winner)

      const res = await POST(req({ id: AUTH_ID, email: EMAIL }))

      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({ user: winner })
    })

    it('still 500s on a non-P2002 database error', async () => {
      mockUser.upsert.mockRejectedValue(new Error('connection reset'))
      const res = await POST(req({ id: AUTH_ID, email: EMAIL }))
      expect(res.status).toBe(500)
      expect(await res.json()).toEqual({ error: 'Failed to sync user' })
    })

    it('500s on P2002 if the winning row cannot be found', async () => {
      mockUser.upsert.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: '6.16.3',
        })
      )
      mockUser.findUnique.mockResolvedValue(null)
      const res = await POST(req({ id: AUTH_ID, email: EMAIL }))
      expect(res.status).toBe(500)
    })
  })
})

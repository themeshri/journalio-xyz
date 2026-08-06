/**
 * @jest-environment node
 *
 * saveJournal used to collapse every failure to `null`, so a 400 validation
 * error and a dropped connection were indistinguishable in the UI — the toast
 * could only say "Failed to save journal entry". These pin the error detail
 * now exposed via getLastSaveJournalError().
 */
import { saveJournal, getLastSaveJournalError } from '../journals'

const payload = {
  walletAddress: 'w',
  tokenMint: 't',
  tradeNumber: 0,
} as Parameters<typeof saveJournal>[0]

function mockFetch(impl: () => Promise<unknown>) {
  ;(global as unknown as { fetch: unknown }).fetch = jest.fn(impl)
}

describe('saveJournal', () => {
  const originalFetch = global.fetch
  let errorSpy: jest.SpyInstance

  beforeEach(() => {
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    errorSpy.mockRestore()
    ;(global as unknown as { fetch: unknown }).fetch = originalFetch
  })

  it('returns the saved record and clears the error on success', async () => {
    mockFetch(async () => ({ ok: true, status: 201, json: async () => ({ id: 'j1' }) }))

    await expect(saveJournal(payload)).resolves.toEqual({ id: 'j1' })
    expect(getLastSaveJournalError()).toBeNull()
  })

  it('exposes the server validation message on a 400', async () => {
    mockFetch(async () => ({
      ok: false,
      status: 400,
      json: async () => ({ error: 'Validation error: buyRating: Too big' }),
    }))

    await expect(saveJournal(payload)).resolves.toBeNull()
    expect(getLastSaveJournalError()).toBe('Validation error: buyRating: Too big')
  })

  it('falls back to the status code when the body is not JSON', async () => {
    mockFetch(async () => ({
      ok: false,
      status: 502,
      json: async () => {
        throw new Error('not json')
      },
    }))

    await expect(saveJournal(payload)).resolves.toBeNull()
    expect(getLastSaveJournalError()).toBe('Request failed (502)')
  })

  it('falls back when the error body has no usable error field', async () => {
    mockFetch(async () => ({ ok: false, status: 500, json: async () => ({}) }))

    await expect(saveJournal(payload)).resolves.toBeNull()
    expect(getLastSaveJournalError()).toBe('Request failed (500)')
  })

  it('reports a thrown network error', async () => {
    mockFetch(async () => {
      throw new Error('Failed to fetch')
    })

    await expect(saveJournal(payload)).resolves.toBeNull()
    expect(getLastSaveJournalError()).toBe('Failed to fetch')
  })

  it('clears a previous error on the next successful save', async () => {
    mockFetch(async () => ({ ok: false, status: 400, json: async () => ({ error: 'boom' }) }))
    await saveJournal(payload)
    expect(getLastSaveJournalError()).toBe('boom')

    mockFetch(async () => ({ ok: true, status: 201, json: async () => ({ id: 'j2' }) }))
    await saveJournal(payload)
    expect(getLastSaveJournalError()).toBeNull()
  })
})

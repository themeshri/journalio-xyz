/**
 * @jest-environment node
 *
 * Tests for the shared handleApiError helper. Verifies it reproduces the
 * copy-pasted route pattern: log server-side, return { error: message } with
 * the given status, and never leak error details to the client.
 */
import { handleApiError } from '../api-error'

describe('handleApiError', () => {
  let spy: jest.SpyInstance

  beforeEach(() => {
    spy = jest.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => spy.mockRestore())

  it('returns { error: message } with default status 500', async () => {
    const res = handleApiError(new Error('boom'), 'Failed to fetch notes')
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body).toEqual({ error: 'Failed to fetch notes' })
  })

  it('honors a custom status code', async () => {
    const res = handleApiError(new Error('x'), 'Bad request', 400)
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Bad request' })
  })

  it('logs the error server-side (details not in the response body)', async () => {
    const err = new Error('secret internal detail')
    const res = handleApiError(err, 'Failed to save note')
    expect(spy).toHaveBeenCalledWith('Failed to save note:', err)
    const body = await res.json()
    expect(JSON.stringify(body)).not.toContain('secret internal detail')
  })
})

import { afterEach, describe, expect, it, vi } from 'vitest'

import { ApiError, apiRequest } from '../../../frontend/src/api/httpClient'

describe('httpClient', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('extracts readable conflict messages and preserves structured payloads', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      text: async () => JSON.stringify({
        detail: 'entity cannot be deleted because it is still in use',
        conflicts: {
          pages: [{ pageId: 'customers' }],
        },
      }),
    }))

    await expect(apiRequest('/entities/1', { method: 'DELETE' })).rejects.toMatchObject({
      name: 'ApiError',
      message: 'entity cannot be deleted because it is still in use',
      status: 409,
    })

    try {
      await apiRequest('/entities/1', { method: 'DELETE' })
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError)
      expect(error.payload.conflicts.pages[0].pageId).toBe('customers')
    }
  })

  it.each([
    ['an HTML error page', '<html><title>Bad Gateway</title></html>', 'text/html'],
    ['invalid JSON', '{not-json', 'application/json'],
    ['an empty response', '', 'text/plain'],
  ])('wraps %s in a readable ApiError', async (_label, body, contentType) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
      headers: { get: () => contentType },
      text: async () => body,
    }))

    await expect(apiRequest('/health')).rejects.toMatchObject({
      name: 'ApiError',
      message: 'Request failed with 502',
      status: 502,
    })
  })
})

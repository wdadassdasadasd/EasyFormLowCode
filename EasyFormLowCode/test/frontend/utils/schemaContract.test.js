import { describe, expect, it, vi } from 'vitest'

import {
  getDefaultPageSchema,
  normalizePageSchemaContract,
  validatePageSchemaContract,
} from '../../../frontend/src/api/schemaContract'

vi.mock('../../../frontend/src/api/httpClient', () => ({
  apiRequest: vi.fn((path, options) => Promise.resolve({ path, options })),
}))

describe('schemaContract api', () => {
  it('requests the backend-owned default page schema', async () => {
    await expect(getDefaultPageSchema('orders')).resolves.toMatchObject({
      path: '/schema-contract/page-schema/default',
      options: { params: { page_id: 'orders' } },
    })
  })

  it('normalizes and validates through the backend contract endpoints', async () => {
    const schema = { schemaVersion: 1, fields: [] }

    await expect(normalizePageSchemaContract('orders', schema)).resolves.toMatchObject({
      path: '/schema-contract/page-schema/normalize',
      options: { method: 'POST', body: { page_id: 'orders', schema_json: schema } },
    })
    await expect(validatePageSchemaContract('orders', schema)).resolves.toMatchObject({
      path: '/schema-contract/page-schema/validate',
      options: { method: 'POST', body: { page_id: 'orders', schema_json: schema } },
    })
  })
})

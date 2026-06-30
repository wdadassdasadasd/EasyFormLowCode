import { describe, expect, it, vi } from 'vitest'

import { usePageSchema } from '../../../frontend/src/composables/usePageSchema'

const apiMocks = vi.hoisted(() => ({
  getPage: vi.fn(),
  getPublishedPage: vi.fn(),
  listReferenceOptions: vi.fn(),
  getDefaultPageSchema: vi.fn(),
  normalizePageSchemaContract: vi.fn(),
}))

vi.mock('../../../frontend/src/api/pages', () => ({
  getPage: apiMocks.getPage,
  getPublishedPage: apiMocks.getPublishedPage,
}))

vi.mock('../../../frontend/src/api/entities', () => ({
  listReferenceOptions: apiMocks.listReferenceOptions,
}))

vi.mock('../../../frontend/src/api/schemaContract', () => ({
  getDefaultPageSchema: apiMocks.getDefaultPageSchema,
  normalizePageSchemaContract: apiMocks.normalizePageSchemaContract,
}))

describe('usePageSchema', () => {
  it('normalizes loaded schemas through the backend contract endpoint', async () => {
    apiMocks.getPage.mockResolvedValue({
      status: 'draft',
      schema_json: { schemaVersion: 1, title: 'Orders', fields: [] },
    })
    apiMocks.normalizePageSchemaContract.mockResolvedValue({
      schema_json: { schemaVersion: 6, id: 'orders', title: 'Orders', fields: [] },
    })

    const schema = usePageSchema({ pageId: 'orders' })
    const result = await schema.loadSchema()

    expect(result.status).toBe('draft')
    expect(apiMocks.normalizePageSchemaContract).toHaveBeenCalledWith('orders', {
      schemaVersion: 1,
      title: 'Orders',
      fields: [],
    })
    expect(schema.pageSchema.schemaVersion).toBe(6)
    expect(schema.pageSchema.id).toBe('orders')
    expect(schema.schemaOffline.value).toBe(false)
  })

  it('falls back to the backend default schema when page loading fails', async () => {
    apiMocks.getPage.mockRejectedValue(new Error('offline'))
    apiMocks.getDefaultPageSchema.mockResolvedValue({
      schema_json: { schemaVersion: 6, id: 'orders', title: 'Fallback', fields: [] },
    })

    const schema = usePageSchema({ pageId: 'orders' })
    const result = await schema.loadSchema()

    expect(result).toBeNull()
    expect(apiMocks.getDefaultPageSchema).toHaveBeenCalledWith('orders')
    expect(schema.pageSchema.title).toBe('Fallback')
    expect(schema.schemaOffline.value).toBe(true)
    expect(schema.schemaError.value).toBe('offline')
  })
})

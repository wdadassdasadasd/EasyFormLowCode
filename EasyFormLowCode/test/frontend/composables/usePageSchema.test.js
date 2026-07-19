import { describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

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
    }, expect.objectContaining({ signal: expect.any(AbortSignal) }))
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
    expect(apiMocks.getDefaultPageSchema).toHaveBeenCalledWith('orders', expect.objectContaining({ signal: expect.any(AbortSignal) }))
    expect(schema.pageSchema.title).toBe('Fallback')
    expect(schema.schemaOffline.value).toBe(true)
    expect(schema.schemaError.value).toBe('offline')
  })

  it('treats a cancelled fallback request as aborted without entering offline state', async () => {
    apiMocks.getPage.mockRejectedValue(new Error('offline'))
    let fallbackStarted
    const fallbackStartedPromise = new Promise((resolve) => { fallbackStarted = resolve })
    apiMocks.getDefaultPageSchema.mockImplementation((_pageId, { signal }) => new Promise((_, reject) => {
      fallbackStarted()
      signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
    }))

    const schema = usePageSchema({ pageId: 'orders' })
    const pending = schema.loadSchema()
    await fallbackStartedPromise
    schema.cancelSchemaLoad()

    await expect(pending).resolves.toEqual({ aborted: true })
    expect(schema.schemaOffline.value).toBe(false)
    expect(schema.schemaError.value).toBe('')
  })

  it('cancels an older schema request and only applies the latest response', async () => {
    let resolveFirst
    let resolveSecond
    const first = new Promise((resolve) => { resolveFirst = resolve })
    const second = new Promise((resolve) => { resolveSecond = resolve })
    const activePageId = ref('first')
    apiMocks.getPage.mockReset()
    apiMocks.normalizePageSchemaContract.mockReset()
    apiMocks.getPage.mockImplementationOnce((_pageId, { signal }) => {
      expect(signal.aborted).toBe(false)
      return first
    }).mockImplementationOnce(() => second)
    apiMocks.normalizePageSchemaContract.mockImplementation(async (pageId, schema) => ({ schema_json: { ...schema, schemaVersion: 6, id: pageId } }))

    const schema = usePageSchema({ pageId: activePageId })
    const pendingFirst = schema.loadSchema()
    activePageId.value = 'second'
    const pendingSecond = schema.loadSchema()
    resolveSecond({ status: 'draft', schema_json: { title: 'Second', fields: [] } })
    await pendingSecond
    resolveFirst({ status: 'draft', schema_json: { title: 'First', fields: [] } })
    await expect(pendingFirst).resolves.toEqual({ aborted: true })

    expect(schema.pageSchema.id).toBe('second')
    expect(schema.pageSchema.title).toBe('Second')
  })
})

import { describe, expect, it, vi } from 'vitest'
import { reactive, ref } from 'vue'

import { useRuntimeCrud } from '../../../frontend/src/composables/useRuntimeCrud'

const apiMocks = vi.hoisted(() => ({
  listRuntimeRecords: vi.fn(),
  getRuntimeStats: vi.fn(),
}))

vi.mock('../../../frontend/src/api/runtime', () => ({
  createRuntimeRecord: vi.fn(),
  deleteRuntimeRecord: vi.fn(),
  deleteRuntimeRecords: vi.fn(),
  executeBatchAction: vi.fn(),
  executeRowAction: vi.fn(),
  getRuntimeStats: apiMocks.getRuntimeStats,
  listRuntimeRecords: apiMocks.listRuntimeRecords,
  updateRuntimeRecord: vi.fn(),
}))

vi.mock('element-plus', () => ({
  ElMessage: { error: vi.fn(), success: vi.fn(), warning: vi.fn() },
  ElMessageBox: { confirm: vi.fn() },
}))

function createCrud(datasource) {
  return useRuntimeCrud({
    pageId: ref('orders'),
    pageSchema: ref({ datasource, fields: [] }),
    searchableFields: ref([]),
    formFields: ref([]),
    searchModel: reactive({}),
    dialogForm: reactive({}),
    formErrors: reactive({}),
  })
}

describe('useRuntimeCrud', () => {
  it('keeps a REST write datasource list online when statistics are unsupported', async () => {
    apiMocks.listRuntimeRecords.mockResolvedValue({ items: [{ id: 'remote-1', name: 'Remote' }], total: 1, page: 1 })
    const crud = createCrud({ mode: 'rest', restWriteEnabled: true, listUrl: 'https://example.test/orders', createUrl: 'https://example.test/orders' })

    await crud.loadRecords()

    expect(crud.recordRows.value).toEqual([{ id: 'remote-1', name: 'Remote' }])
    expect(crud.isOffline.value).toBe(false)
    expect(crud.statsAvailable.value).toBe(false)
    expect(apiMocks.getRuntimeStats).not.toHaveBeenCalled()
  })

  it('keeps successfully loaded records when internal statistics fail', async () => {
    apiMocks.listRuntimeRecords.mockResolvedValue({ items: [{ id: 1, name: 'Kept' }], total: 1, page: 1 })
    apiMocks.getRuntimeStats.mockRejectedValue(new Error('stats failed'))
    const crud = createCrud({ mode: 'runtime' })

    await crud.loadRecords()

    expect(crud.recordRows.value).toEqual([{ id: 1, name: 'Kept' }])
    expect(crud.isOffline.value).toBe(false)
    expect(crud.runtimeNotice.value).toContain('statistics are temporarily unavailable')
  })

  it('does not let a late records response overwrite the latest request', async () => {
    let resolveFirst
    let resolveSecond
    const first = new Promise((resolve) => { resolveFirst = resolve })
    const second = new Promise((resolve) => { resolveSecond = resolve })
    apiMocks.listRuntimeRecords.mockReset()
    apiMocks.getRuntimeStats.mockReset()
    apiMocks.listRuntimeRecords.mockReturnValueOnce(first).mockReturnValueOnce(second)
    apiMocks.getRuntimeStats.mockResolvedValue({ records: [], metrics: [], charts: [] })
    const crud = createCrud({ mode: 'runtime' })

    const pendingFirst = crud.loadRecords()
    const pendingSecond = crud.loadRecords()
    resolveSecond({ items: [{ id: 2, name: 'Latest' }], total: 1, page: 1 })
    await pendingSecond
    resolveFirst({ items: [{ id: 1, name: 'Stale' }], total: 1, page: 1 })
    await expect(pendingFirst).resolves.toEqual({ aborted: true })

    expect(crud.recordRows.value).toEqual([{ id: 2, name: 'Latest' }])
  })
})

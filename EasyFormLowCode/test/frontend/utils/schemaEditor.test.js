import { describe, expect, it } from 'vitest'

import { applyDatasourceCapabilityToActions, normalizeEditableFieldProp } from '../../../frontend/src/utils/schemaEditor'

describe('schemaEditor', () => {
  it('normalizes duplicate props into readable unique values', () => {
    const result = normalizeEditableFieldProp('Display Name', 'field_2', [
      { id: 'field_1', prop: 'Display_Name' },
      { id: 'field_2', prop: 'legacy' },
    ], 'input_2')

    expect(result.value).toBe('Display_Name_2')
    expect(result.message).toContain('自动')
  })

  it('locks write actions for readonly REST datasources', () => {
    const actions = applyDatasourceCapabilityToActions(
      { search: true, reset: true, create: true, edit: true, delete: true, batchDelete: true },
      { mode: 'rest' },
    )

    expect(actions.search).toBe(true)
    expect(actions.reset).toBe(true)
    expect(actions.create).toBe(false)
    expect(actions.edit).toBe(false)
    expect(actions.delete).toBe(false)
    expect(actions.batchDelete).toBe(false)
  })
})

import { describe, expect, it } from 'vitest'

import { useSchemaHistory } from '../../../frontend/src/composables/useSchemaHistory'

describe('schema history', () => {
  it('undoes and redoes immutable schema snapshots', () => {
    const history = useSchemaHistory()
    history.reset({ id: 'page', fields: [] })
    history.commit({ id: 'page', fields: [{ id: 'field_a' }] })

    expect(history.canUndo.value).toBe(true)
    expect(history.canRedo.value).toBe(false)
    expect(history.undo()).toEqual({ id: 'page', fields: [] })
    expect(history.canUndo.value).toBe(false)
    expect(history.canRedo.value).toBe(true)
    expect(history.redo()).toEqual({ id: 'page', fields: [{ id: 'field_a' }] })
    expect(history.canUndo.value).toBe(true)
  })

  it('skips duplicate commits and keeps the latest label', () => {
    const history = useSchemaHistory()
    history.reset({ id: 'page', fields: [] }, 'initial')

    history.commit({ id: 'page', fields: [] }, 'duplicate')
    expect(history.canUndo.value).toBe(false)
    expect(history.currentLabel()).toBe('initial')

    history.commit({ id: 'page', fields: [{ id: 'field_a' }] }, 'add-field')
    expect(history.canUndo.value).toBe(true)
    expect(history.currentLabel()).toBe('add-field')
  })
})

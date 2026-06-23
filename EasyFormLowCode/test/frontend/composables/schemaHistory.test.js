import { describe, expect, it } from 'vitest'

import { useSchemaHistory } from '../../../frontend/src/composables/useSchemaHistory'

describe('schema history', () => {
  it('undoes and redoes immutable schema snapshots', () => {
    const history = useSchemaHistory()
    history.reset({ id: 'page', fields: [] })
    history.commit({ id: 'page', fields: [{ id: 'field_a' }] })

    expect(history.undo()).toEqual({ id: 'page', fields: [] })
    expect(history.redo()).toEqual({ id: 'page', fields: [{ id: 'field_a' }] })
  })
})

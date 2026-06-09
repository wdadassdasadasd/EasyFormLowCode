import { describe, expect, it } from 'vitest'

import { createDroppedField } from './dropField'

describe('createDroppedField', () => {
  it.each(['input', 'select', 'date', 'switch'])('creates a valid %s field for drag drop', (type) => {
    const field = createDroppedField(type, 'table', [])

    expect(field.type).toBe(type)
    expect(field.id).toBeTruthy()
    expect(field.label).toBeTruthy()
    expect(field.prop).toBeTruthy()
    expect(field.tableVisible).toBe(true)
  })

  it('keeps props unique when the same material is dropped repeatedly', () => {
    const first = createDroppedField('input', 'table', [])
    const second = createDroppedField('input', 'table', [first])
    const third = createDroppedField('input', 'table', [first, second])

    expect(new Set([first.prop, second.prop, third.prop]).size).toBe(3)
  })

  it.each([
    ['search', 'searchable'],
    ['table', 'tableVisible'],
    ['form', 'formVisible'],
  ])('enables %s visibility for the target area', (area, flag) => {
    const field = createDroppedField('textarea', area, [])

    expect(field[flag]).toBe(true)
  })

  it('falls back unknown field types through the field registry', () => {
    const field = createDroppedField('unknown', 'form', [])

    expect(field.type).toBe('input')
    expect(field.formVisible).toBe(true)
  })
})

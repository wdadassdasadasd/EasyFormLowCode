import { describe, expect, it } from 'vitest'

import { normalizePageSchema } from '../../../frontend/src/schema/pageSchema'

describe('pageSchema normalization', () => {
  it('fills page defaults and normalizes fields through one entrypoint', () => {
    const schema = normalizePageSchema('orders', {
      title: 'Orders',
      fields: [
        { id: 'field_name', type: 'input', label: 'Name', prop: 'name' },
        { id: 'field_name_2', type: 'unknown', label: 'Name Copy', prop: 'name' },
      ],
    })

    expect(schema.id).toBe('orders')
    expect(schema.pageType).toBe('crud')
    expect(schema.api.listUrl).toBe('/api/runtime/pages/orders/records')
    expect(schema.fields.map((field) => field.type)).toEqual(['input', 'input'])
    expect(schema.fields.map((field) => field.prop)).toEqual(['name', 'name_2'])
    expect(schema.charts.length).toBeGreaterThan(0)
  })

  it('falls back to default fields when persisted fields are missing', () => {
    const schema = normalizePageSchema('empty', { fields: null, charts: null })

    expect(schema.id).toBe('empty')
    expect(schema.fields.length).toBeGreaterThan(0)
    expect(schema.charts.length).toBeGreaterThan(0)
  })
})

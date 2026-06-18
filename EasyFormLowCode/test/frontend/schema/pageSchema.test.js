import { describe, expect, it } from 'vitest'

import { normalizePageSchema, validatePageSchema } from '../../../frontend/src/schema/pageSchema'

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
    expect(schema.schemaVersion).toBe(1)
    expect(schema.pageType).toBe('crud')
    expect(schema.datasource.listUrl).toBe('/api/runtime/pages/orders/records')
    expect(schema.api.listUrl).toBe('/api/runtime/pages/orders/records')
    expect(schema.actions.search).toBe(true)
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

  it('migrates legacy api config into datasource and default actions', () => {
    const schema = normalizePageSchema('legacy', {
      api: {
        mode: 'rest',
        listUrl: 'https://example.com/list',
      },
      actions: null,
    })

    expect(schema.schemaVersion).toBe(1)
    expect(schema.datasource.mode).toBe('rest')
    expect(schema.datasource.listUrl).toBe('https://example.com/list')
    expect(schema.actions.batchDelete).toBe(true)
  })

  it('reports invalid root-level schema shapes', () => {
    const result = validatePageSchema({
      schemaVersion: 1,
      fields: {},
      datasource: { mode: 'ftp' },
    })

    expect(result.valid).toBe(false)
    expect(result.errors).toContain('fields must be an array')
    expect(result.errors).toContain('datasource.mode must be runtime or rest')
  })
})

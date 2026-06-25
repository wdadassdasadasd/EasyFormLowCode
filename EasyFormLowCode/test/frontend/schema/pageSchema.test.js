import { describe, expect, it } from 'vitest'

import { normalizePageSchema, validatePageSchema } from '../../../frontend/src/schema/pageSchema'
import contractFixture from '../../fixtures/page-schema-contract.json'

describe('pageSchema normalization', () => {
  it('migrates a v1 document to the current schema version', () => {
    expect(normalizePageSchema('legacy', { schemaVersion: 1, fields: [] }).schemaVersion).toBe(5)
  })
  it('fills page defaults and normalizes fields through one entrypoint', () => {
    const schema = normalizePageSchema('orders', {
      title: 'Orders',
      fields: [
        { id: 'field_name', type: 'input', label: 'Name', prop: 'name' },
        { id: 'field_name_2', type: 'unknown', label: 'Name Copy', prop: 'name' },
      ],
    })

    expect(schema.id).toBe('orders')
    expect(schema.schemaVersion).toBe(5)
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

  it('preserves an explicitly empty metrics array', () => {
    expect(normalizePageSchema('empty-metrics', { metrics: [] }).metrics).toEqual([])
  })

  it('migrates legacy api config into datasource and default actions', () => {
    const schema = normalizePageSchema('legacy', {
      api: {
        mode: 'rest',
        listUrl: 'https://example.com/list',
      },
      actions: null,
    })

    expect(schema.schemaVersion).toBe(5)
    expect(schema.datasource.mode).toBe('rest')
    expect(schema.datasource.listUrl).toBe('https://example.com/list')
    expect(schema.datasource.listMethod).toBe('GET')
    expect(schema.datasource.requestBodyKey).toBe('data')
    expect(schema.actions.batchDelete).toBe(true)
  })

  it('normalizes queries and action lists for v5 schemas', () => {
    const schema = normalizePageSchema('users', {
      fields: [{ id: 'field_name', type: 'input', label: 'Name', prop: 'name' }],
      queries: [{ id: 'q1', label: 'Name', fieldProp: 'name', paramKey: 'keyword', operator: 'contains' }],
      rowActions: [{ id: 'edit_1', type: 'edit', label: 'Edit' }],
      batchActions: [{ id: 'batch_1', type: 'request', label: 'Archive', method: 'post', url: '/archive' }],
    })

    expect(schema.queries[0]).toMatchObject({ id: 'q1', paramKey: 'keyword', operator: 'contains' })
    expect(schema.rowActions[0]).toMatchObject({ id: 'edit_1', type: 'edit', label: 'Edit' })
    expect(schema.batchActions[0]).toMatchObject({ id: 'batch_1', type: 'request', method: 'POST' })
  })

  it('rejects request actions without urls', () => {
    const result = validatePageSchema({
      fields: [{ id: 'field_name', prop: 'name', type: 'input' }],
      rowActions: [{ id: 'row_1', type: 'request', label: 'Archive' }],
      batchActions: [{ id: 'batch_1', type: 'request', label: 'Archive all' }],
    })

    expect(result.valid).toBe(false)
    expect(result.errors).toContain('rowActions[0].url is required for request actions')
    expect(result.errors).toContain('batchActions[0].url is required for request actions')
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

  it('rejects duplicate field identities and chart dimensions outside the schema', () => {
    const result = validatePageSchema({
      schemaVersion: 1,
      fields: [
        { id: 'name', prop: 'name', type: 'input' },
        { id: 'name', prop: 'name', type: 'select', options: [{ label: 'A', value: 'a' }, { label: 'B', value: 'a' }] },
      ],
      charts: [{ id: 'missing', type: 'pie', dimension: 'missing' }],
    })

    expect(result.valid).toBe(false)
    expect(result.errors).toContain('duplicate field id: name')
    expect(result.errors).toContain('duplicate field prop: name')
    expect(result.errors).toContain('fields[1].options values must be unique')
    expect(result.errors).toContain('charts[0].dimension must reference a field prop')
  })

  it('accepts the shared frontend/backend contract fixture', () => {
    expect(validatePageSchema(contractFixture.validPageSchema)).toEqual({ valid: true, errors: [] })
    expect(validatePageSchema(contractFixture.invalidPageSchema).valid).toBe(false)
  })
})

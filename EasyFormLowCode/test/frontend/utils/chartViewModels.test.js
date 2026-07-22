import { describe, expect, it } from 'vitest'

import { buildDefaultCharts } from '../../../frontend/src/utils/chartAggregator'
import { buildChartViewModels } from '../../../frontend/src/utils/chartViewModels'

describe('buildChartViewModels', () => {
  it('returns configured charts joined with aggregates by id', () => {
    const schema = {
      fields: [{ id: 'f1', prop: 'amount' }],
      charts: [{ id: 'chart_total', type: 'pie' }],
    }
    const aggregates = [{ id: 'chart_total', data: [{ name: 'a', value: 1 }] }]
    const models = buildChartViewModels(schema, aggregates)
    expect(models).toHaveLength(1)
    expect(models[0].id).toBe('chart_total')
    expect(models[0].aggregate).toEqual(aggregates[0])
  })

  it('falls back to default charts when schema has none and leaves aggregate null', () => {
    const schema = { fields: [{ id: 'f1', prop: 'amount' }], charts: [] }
    const models = buildChartViewModels(schema)
    expect(models.length).toBe(buildDefaultCharts(schema.fields).length)
    expect(models[0].aggregate).toBe(null)
  })

  it('treats missing aggregate as null and tolerates undefined aggregates arg', () => {
    const schema = {
      fields: [],
      charts: [{ id: 'chart_only', type: 'bar' }],
    }
    const models = buildChartViewModels(schema)
    expect(models).toHaveLength(1)
    expect(models[0].aggregate).toBe(null)
  })
})
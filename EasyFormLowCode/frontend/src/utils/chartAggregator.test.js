import { describe, expect, it } from 'vitest'

import { createFieldByType } from '../schema/fieldTypes'
import { aggregateChart, buildDefaultCharts, buildMetricCards } from './chartAggregator'

const fields = [
  createFieldByType('select', {
    id: 'field_status',
    label: '状态',
    prop: 'status',
    options: [
      { label: '启用', value: 'enabled' },
      { label: '停用', value: 'disabled' },
    ],
  }),
  createFieldByType('date', {
    id: 'field_created',
    label: '创建时间',
    prop: 'createdAt',
  }),
]

const records = [
  { id: 1, status: 'enabled', createdAt: '2026-06-01' },
  { id: 2, status: 'disabled', createdAt: '2026-05-01' },
  { id: 3, status: 'enabled', createdAt: '2026-06-02' },
]

describe('chartAggregator', () => {
  it('builds metric cards from current records', () => {
    const metrics = buildMetricCards(records, fields)

    expect(metrics[0].value).toBe(3)
    expect(metrics[1].value).toBe(2)
  })

  it('aggregates option labels for pie charts', () => {
    const chart = aggregateChart({ id: 'statusPie', type: 'pie', title: '状态分布', dimension: 'status' }, records, fields)

    expect(chart.labels).toEqual(['启用', '停用'])
    expect(chart.values).toEqual([2, 1])
    expect(chart.empty).toBe(false)
  })

  it('handles empty records and unknown dimensions', () => {
    const chart = aggregateChart({ id: 'unknownBar', type: 'bar', title: '未知字段', dimension: 'missing' }, [], fields)

    expect(chart.labels).toEqual([])
    expect(chart.values).toEqual([])
    expect(chart.empty).toBe(true)
  })

  it('creates default charts from available fields', () => {
    const charts = buildDefaultCharts(fields)

    expect(charts.map((chart) => chart.type)).toContain('pie')
    expect(charts.map((chart) => chart.type)).toContain('bar')
  })
})

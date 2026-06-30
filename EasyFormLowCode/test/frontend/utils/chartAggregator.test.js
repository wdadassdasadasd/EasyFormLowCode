import { describe, expect, it } from 'vitest'

import { createFieldByType } from '../../../frontend/src/schema/fieldTypes'
import { aggregateChart, buildDefaultCharts, buildMetricCards } from '../../../frontend/src/utils/chartAggregator'

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
  createFieldByType('datetime', {
    id: 'field_created',
    label: '创建时间',
    prop: 'createdAt',
  }),
  createFieldByType('number', {
    id: 'field_score',
    label: '积分',
    prop: 'score',
  }),
]

const records = [
  { id: 1, status: 'enabled', createdAt: '2026-06-01 09:00:00', score: 20 },
  { id: 2, status: 'disabled', createdAt: '2026-05-01 09:00:00', score: 10 },
  { id: 3, status: 'enabled', createdAt: '2026-06-02 09:00:00', score: 30 },
]

describe('chartAggregator', () => {
  it('builds metric cards from current records', () => {
    const metrics = buildMetricCards(records, fields)

    expect(metrics[0].value).toBe(3)
    expect(metrics[1].value).toBe(2)
  })

  it('builds configured metric cards from schema definitions', () => {
    const metrics = buildMetricCards(records, fields, [
      { id: 'sum_score', title: '积分求和', type: 'sum', field: 'score' },
      { id: 'avg_score', title: '积分均值', type: 'average', field: 'score', precision: 1 },
      { id: 'min_score', title: '积分最小值', type: 'min', field: 'score' },
      { id: 'max_score', title: '积分最大值', type: 'max', field: 'score' },
      { id: 'percent_score', title: '20 分占比', type: 'percent', field: 'score', value: 20, precision: 1, suffix: '%' },
    ])

    expect(metrics).toEqual([
      expect.objectContaining({ id: 'sum_score', value: 60 }),
      expect.objectContaining({ id: 'avg_score', value: 20, displayValue: '20.0' }),
      expect.objectContaining({ id: 'min_score', value: 10 }),
      expect.objectContaining({ id: 'max_score', value: 30 }),
      expect.objectContaining({ id: 'percent_score', value: expect.closeTo(33.333, 2) }),
    ])
  })

  it('preserves an explicitly empty metric configuration', () => {
    expect(buildMetricCards(records, fields, [])).toEqual([])
  })

  it('aggregates option labels for pie charts', () => {
    const chart = aggregateChart({ id: 'statusPie', type: 'pie', title: '状态分布', dimension: 'status' }, records, fields)

    expect(chart.labels).toEqual(['启用', '停用'])
    expect(chart.values).toEqual([2, 1])
    expect(chart.empty).toBe(false)
  })

  it('supports line, area and rankBar charts with limits', () => {
    const line = aggregateChart({ id: 'scoreLine', type: 'line', dimension: 'createdAt', metric: 'sum', measureField: 'score', sort: 'asc' }, records, fields)
    const area = aggregateChart({ id: 'scoreArea', type: 'area', dimension: 'createdAt', metric: 'average', measureField: 'score', sort: 'asc' }, records, fields)
    const rankBar = aggregateChart({ id: 'scoreRank', type: 'rankBar', dimension: 'status', metric: 'sum', measureField: 'score', limit: 1 }, records, fields)

    expect(line.labels).toHaveLength(3)
    expect(area.values[0]).toBe(10)
    expect(rankBar.labels).toEqual(['启用'])
    expect(rankBar.values).toEqual([50])
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

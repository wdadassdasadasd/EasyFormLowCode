import { formatFieldValue, getFieldsByUsage, normalizeField } from '../schema/fieldTypes'

export function buildMetricCards(records = [], fields = [], metrics) {
  if (Array.isArray(metrics)) {
    return metrics.map((metric) => buildMetricCard(metric, records, fields))
  }
  const total = records.length
  const statusField = findField(fields, ['status', 'enabled', 'switch'])
  const createdField = findField(fields, ['createdAt', 'created_at', 'date'])
  const enabledCount = statusField
    ? records.filter((record) => isEnabledValue(record[statusField.prop])).length
    : records.filter((record) => isEnabledValue(record.status) || isEnabledValue(record.enabled)).length
  const recentCount = createdField ? countRecentRecords(records, createdField.prop) : 0

  return [
    { id: 'total', title: '记录总数', value: total, trend: total > 0 ? '来自当前数据集' : '暂无数据', tone: 'blue' },
    { id: 'enabled', title: '启用记录', value: enabledCount, trend: `${total ? Math.round((enabledCount / total) * 100) : 0}% 占比`, tone: 'green' },
    { id: 'recent', title: '近 30 天新增', value: recentCount, trend: createdField ? createdField.label : '未配置日期字段', tone: 'orange' },
  ]
}

export function buildMetricCard(metric = {}, records = [], fields = []) {
  const normalized = { id: metric.id || 'metric', title: metric.title || '数据统计', type: metric.type || 'total', tone: metric.tone || 'blue' }
  const field = fields.find((item) => item.prop === metric.field)
  let value = records.length
  let trend = records.length ? '来自当前数据集' : '暂无数据'
  if (normalized.type === 'match') {
    value = records.filter((record) => String(record[metric.field]) === String(metric.value)).length
    trend = field ? `${field.label} = ${metric.value ?? ''}` : '未配置统计字段'
  }
  if (normalized.type === 'recent') {
    value = metric.field ? countRecentRecords(records, metric.field) : 0
    trend = field ? field.label : '未配置日期字段'
  }
  return { ...normalized, value, trend }
}

export function aggregateChart(chart = {}, records = [], fields = []) {
  const normalizedChart = {
    id: chart.id || `${chart.type || 'metric'}_${chart.dimension || 'records'}`,
    title: chart.title || '数据统计',
    type: chart.type || 'pie',
    dimension: chart.dimension || fields[0]?.prop || '',
    metric: chart.metric || 'count',
  }
  const field = fields.map((item, index) => normalizeField(item, index + 1, fields)).find((item) => item.prop === normalizedChart.dimension)

  if (normalizedChart.type === 'metric') {
    return {
      ...normalizedChart,
      value: records.length,
      labels: ['记录数'],
      values: [records.length],
      empty: records.length === 0,
    }
  }

  const groups = records.reduce((result, record) => {
    const rawValue = record[normalizedChart.dimension]
    const label = field ? formatFieldValue(field, rawValue) : rawValue
    const key = label === '' || label === undefined || label === null ? '未填写' : String(label)
    result.set(key, (result.get(key) || 0) + 1)
    return result
  }, new Map())

  const entries = Array.from(groups.entries())

  return {
    ...normalizedChart,
    labels: entries.map(([label]) => label),
    values: entries.map(([, value]) => value),
    empty: entries.length === 0,
  }
}

export function buildDefaultCharts(fields = []) {
  const tableFields = getFieldsByUsage(fields, 'table')
  const statusField = tableFields.find((field) => ['status', 'enabled'].includes(field.prop)) || tableFields.find((field) => field.options?.length)
  const dateField = tableFields.find((field) => field.type === 'date')

  return [
    {
      id: 'recordMetric',
      type: 'metric',
      title: '记录总数',
      metric: 'count',
    },
    {
      id: 'statusPie',
      type: 'pie',
      title: '状态分布',
      dimension: statusField?.prop || tableFields[0]?.prop || 'status',
      metric: 'count',
    },
    {
      id: 'createdBar',
      type: 'bar',
      title: '创建时间分布',
      dimension: dateField?.prop || statusField?.prop || tableFields[0]?.prop || 'createdAt',
      metric: 'count',
    },
  ]
}

function findField(fields, candidates) {
  return fields.find((field) => candidates.includes(field.prop) || candidates.includes(field.type))
}

function isEnabledValue(value) {
  return value === true || value === 'true' || value === 'enabled' || value === '启用' || value === 'yes'
}

function countRecentRecords(records, prop) {
  const now = Date.now()
  const thirtyDays = 30 * 24 * 60 * 60 * 1000

  return records.filter((record) => {
    const time = Date.parse(record[prop])
    return Number.isFinite(time) && now - time <= thirtyDays
  }).length
}

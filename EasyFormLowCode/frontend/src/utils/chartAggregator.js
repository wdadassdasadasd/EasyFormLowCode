import { formatFieldValue, getFieldsByUsage, normalizeField } from '../schema/fieldTypes'

export function buildMetricCards(records = [], fields = [], metrics) {
  if (Array.isArray(metrics)) {
    return metrics.map((metric) => buildMetricCard(metric, records, fields))
  }
  const total = records.length
  const statusField = findField(fields, ['status', 'enabled', 'switch'])
  const createdField = findField(fields, ['createdAt', 'created_at', 'date', 'datetime'])
  const enabledCount = statusField
    ? records.filter((record) => isEnabledValue(record[statusField.prop])).length
    : records.filter((record) => isEnabledValue(record.status) || isEnabledValue(record.enabled)).length
  const recentCount = createdField ? countRecentRecords(records, createdField.prop, 30) : 0

  return [
    { id: 'total', title: '记录总数', type: 'total', value: total, displayValue: formatMetricValue(total), trend: total > 0 ? '来自当前数据集' : '暂无数据', tone: 'blue' },
    { id: 'enabled', title: '启用记录', type: 'match', value: enabledCount, displayValue: formatMetricValue(enabledCount), trend: `${total ? Math.round((enabledCount / total) * 100) : 0}% 占比`, tone: 'green' },
    { id: 'recent', title: '近 30 天新增', type: 'recent', value: recentCount, displayValue: formatMetricValue(recentCount), trend: createdField ? createdField.label : '未配置日期字段', tone: 'orange' },
  ]
}

export function buildMetricCard(metric = {}, records = [], fields = []) {
  const normalized = {
    id: metric.id || 'metric',
    title: metric.title || '数据统计',
    type: metric.type || 'total',
    tone: metric.tone || 'blue',
    prefix: metric.prefix || '',
    suffix: metric.suffix || '',
    precision: Number.isInteger(metric.precision) ? metric.precision : 0,
    recentDays: Number(metric.recentDays) > 0 ? Number(metric.recentDays) : 30,
  }
  const field = fields.find((item) => item.prop === metric.field)
  const values = metric.field ? records.map((record) => normalizeNumber(record[metric.field])).filter((value) => value !== null) : []
  let value = records.length
  let trend = records.length ? '来自当前数据集' : '暂无数据'

  if (normalized.type === 'match') {
    value = records.filter((record) => String(record[metric.field]) === String(metric.value)).length
    trend = field ? `${field.label} = ${metric.value ?? ''}` : '未配置统计字段'
  }
  if (normalized.type === 'recent') {
    value = metric.field ? countRecentRecords(records, metric.field, normalized.recentDays) : 0
    trend = field ? `${field.label} · 最近 ${normalized.recentDays} 天` : '未配置日期字段'
  }
  if (normalized.type === 'sum') {
    value = values.reduce((sum, item) => sum + item, 0)
    trend = field ? `${field.label} 求和` : '未配置数值字段'
  }
  if (normalized.type === 'average') {
    value = values.length ? values.reduce((sum, item) => sum + item, 0) / values.length : 0
    trend = field ? `${field.label} 平均值` : '未配置数值字段'
  }
  if (normalized.type === 'min') {
    value = values.length ? Math.min(...values) : 0
    trend = field ? `${field.label} 最小值` : '未配置数值字段'
  }
  if (normalized.type === 'max') {
    value = values.length ? Math.max(...values) : 0
    trend = field ? `${field.label} 最大值` : '未配置数值字段'
  }
  if (normalized.type === 'percent') {
    const matched = records.filter((record) => normalizeNumber(record[metric.field]) === normalizeNumber(metric.value)).length
    value = records.length ? (matched / records.length) * 100 : 0
    normalized.suffix = normalized.suffix || '%'
    trend = field ? `${field.label} = ${metric.value ?? ''}` : '未配置统计字段'
  }

  return {
    ...normalized,
    field: metric.field || '',
    rawValue: value,
    value: value,
    displayValue: formatMetricValue(value, normalized),
    trend,
  }
}

export function aggregateChart(chart = {}, records = [], fields = []) {
  const normalizedChart = {
    id: chart.id || `${chart.type || 'metric'}_${chart.dimension || 'records'}`,
    title: chart.title || '数据统计',
    type: chart.type || 'pie',
    dimension: chart.dimension || fields[0]?.prop || '',
    metric: chart.metric || 'count',
    measureField: chart.measureField || '',
    limit: Number(chart.limit) > 0 ? Number(chart.limit) : 8,
    sort: chart.sort || 'desc',
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
    if (!result.has(key)) {
      result.set(key, [])
    }
    result.get(key).push(record)
    return result
  }, new Map())

  const entries = Array.from(groups.entries()).map(([label, items]) => ({
    label,
    value: aggregateMetricValue(items, normalizedChart.metric, normalizedChart.measureField),
  }))

  const sorted = sortEntries(entries, normalizedChart.sort, field).slice(0, normalizedChart.limit)

  return {
    ...normalizedChart,
    labels: sorted.map((item) => item.label),
    values: sorted.map((item) => item.value),
    empty: sorted.length === 0,
  }
}

export function buildDefaultCharts(fields = []) {
  const tableFields = getFieldsByUsage(fields, 'table')
  const statusField = tableFields.find((field) => ['status', 'enabled'].includes(field.prop)) || tableFields.find((field) => field.options?.length)
  const dateField = tableFields.find((field) => ['date', 'datetime'].includes(field.type))
  const numericField = tableFields.find((field) => ['number', 'slider', 'rate'].includes(field.type))

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
      limit: 8,
      sort: 'desc',
    },
    {
      id: 'createdBar',
      type: 'bar',
      title: '创建趋势',
      dimension: dateField?.prop || statusField?.prop || tableFields[0]?.prop || 'createdAt',
      metric: numericField ? 'sum' : 'count',
      measureField: numericField?.prop || '',
      limit: 10,
      sort: 'asc',
    },
  ]
}

export function formatMetricValue(value, metric = {}) {
  const precision = Number.isInteger(metric.precision) ? metric.precision : 0
  const prefix = metric.prefix || ''
  const suffix = metric.suffix || ''
  const normalized = Number.isFinite(Number(value)) ? Number(value) : 0
  return `${prefix}${normalized.toFixed(precision)}${suffix}`
}

function findField(fields, candidates) {
  return fields.find((field) => candidates.includes(field.prop) || candidates.includes(field.type))
}

function isEnabledValue(value) {
  return value === true || value === 'true' || value === 'enabled' || value === '启用' || value === 'yes'
}

function countRecentRecords(records, prop, recentDays = 30) {
  const now = Date.now()
  const duration = Number(recentDays) * 24 * 60 * 60 * 1000

  return records.filter((record) => {
    const time = Date.parse(record[prop])
    return Number.isFinite(time) && now - time <= duration
  }).length
}

function aggregateMetricValue(records, metric, measureField) {
  if (metric === 'count') {
    return records.length
  }
  const values = records.map((record) => normalizeNumber(record[measureField])).filter((value) => value !== null)
  if (!values.length) {
    return 0
  }
  if (metric === 'sum') {
    return values.reduce((sum, value) => sum + value, 0)
  }
  if (metric === 'average') {
    return values.reduce((sum, value) => sum + value, 0) / values.length
  }
  if (metric === 'min') {
    return Math.min(...values)
  }
  if (metric === 'max') {
    return Math.max(...values)
  }
  return records.length
}

function sortEntries(entries, order = 'desc', field = null) {
  const optionOrder = new Map(
    normalizeField(field || {}, 1, []).options.map((option, index) => [String(option.label), index]),
  )
  return [...entries].sort((left, right) => {
    if (order === 'asc') {
      return left.label.localeCompare(right.label, 'zh-CN')
    }
    if (right.value !== left.value) {
      return right.value - left.value
    }
    return (optionOrder.get(String(left.label)) ?? Number.MAX_SAFE_INTEGER) - (optionOrder.get(String(right.label)) ?? Number.MAX_SAFE_INTEGER)
  })
}

function normalizeNumber(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

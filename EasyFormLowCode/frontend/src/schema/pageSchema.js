import {
  buildRuntimeDatasource,
  createDefaultPageSchema,
  DEFAULT_PAGE_ACTIONS,
  SCHEMA_VERSION,
} from './defaultSchema'
import { normalizeField } from './fieldTypes'

const VALID_DATASOURCE_MODES = new Set(['runtime', 'rest'])
const VALID_FIELD_TYPES = new Set([
  'input',
  'password',
  'textarea',
  'email',
  'phone',
  'url',
  'number',
  'slider',
  'rate',
  'select',
  'radio',
  'checkbox',
  'cascader',
  'switch',
  'tag',
  'date',
  'datetime',
  'time',
])
const VALID_QUERY_OPERATORS = new Set(['contains', 'eq'])
const VALID_ROW_ACTION_TYPES = new Set(['edit', 'delete', 'request'])
const VALID_BATCH_ACTION_TYPES = new Set(['batchDelete', 'request'])
const VALID_METRIC_TYPES = new Set(['total', 'match', 'recent', 'sum', 'average', 'min', 'max', 'percent'])
const VALID_CHART_TYPES = new Set(['metric', 'pie', 'bar', 'line', 'area', 'rankBar'])
const VALID_CHART_METRICS = new Set(['count', 'sum', 'average', 'min', 'max'])
const VALID_SORT_ORDERS = new Set(['asc', 'desc'])

export function migratePageSchema(pageId = 'user_manage', schema = {}) {
  const source = isPlainObject(schema) ? clonePageSchema(schema) : {}
  const migrated = { ...source }

  let version = Number.isInteger(migrated.schemaVersion) ? migrated.schemaVersion : 1
  version = Math.max(version, 1)
  while (version < SCHEMA_VERSION) {
    if (version === 1) migrated.schemaVersion = 2
    if (version === 2) migrated.metrics = Array.isArray(migrated.metrics) ? migrated.metrics : []
    if (version === 3) {
      migrated.entity = isPlainObject(migrated.entity) ? migrated.entity : null
      migrated.templateKey = typeof migrated.templateKey === 'string' ? migrated.templateKey : null
    }
    if (version === 4) {
      migrated.queries = Array.isArray(migrated.queries) ? migrated.queries : []
      migrated.rowActions = Array.isArray(migrated.rowActions) ? migrated.rowActions : []
      migrated.batchActions = Array.isArray(migrated.batchActions) ? migrated.batchActions : []
    }
    if (version === 5) {
      migrated.metrics = Array.isArray(migrated.metrics) ? migrated.metrics : []
      migrated.charts = Array.isArray(migrated.charts) ? migrated.charts : []
    }
    version += 1
  }
  migrated.schemaVersion = SCHEMA_VERSION

  // 历史兼容：早期 schema 仅存 `api` 字段作为数据源描述，后改为 `datasource`。
  // 当前 PageSchema 协议以 `datasource` 为唯一事实来源，`api` 仅为旧数据平滑
  // 迁移而保留的镜像，normalize 阶段始终让两者保持一致。新代码请只读写
  // `datasource`，下次 schema 迁移窗口再考虑废弃 `api` 字段。
  if (!isPlainObject(migrated.datasource) && isPlainObject(migrated.api)) {
    migrated.datasource = { ...migrated.api }
  }
  if (!isPlainObject(migrated.api) && isPlainObject(migrated.datasource)) {
    migrated.api = { ...migrated.datasource }
  }
  if (!isPlainObject(migrated.actions)) {
    migrated.actions = { ...DEFAULT_PAGE_ACTIONS }
  }
  if (!migrated.id) {
    migrated.id = pageId
  }
  return migrated
}

export function getPageSchemaValidationErrors(schema = {}) {
  if (!isPlainObject(schema)) {
    return ['PageSchema must be an object']
  }

  const errors = []
  const checks = [
    ['schemaVersion', (value) => Number.isInteger(value), 'schemaVersion must be an integer'],
    ['id', (value) => typeof value === 'string' || value === undefined, 'id must be a string'],
    ['title', (value) => typeof value === 'string' || value === undefined, 'title must be a string'],
    ['pageType', (value) => typeof value === 'string' || value === undefined, 'pageType must be a string'],
    ['api', (value) => isPlainObject(value) || value === undefined, 'api must be an object'],
    ['datasource', (value) => isPlainObject(value) || value === undefined, 'datasource must be an object'],
    ['fields', (value) => Array.isArray(value) || value === undefined, 'fields must be an array'],
    ['table', (value) => isPlainObject(value) || value === undefined, 'table must be an object'],
    ['formDialog', (value) => isPlainObject(value) || value === undefined, 'formDialog must be an object'],
    ['charts', (value) => Array.isArray(value) || value === undefined, 'charts must be an array'],
    ['metrics', (value) => Array.isArray(value) || value === undefined, 'metrics must be an array'],
    ['queries', (value) => Array.isArray(value) || value === undefined, 'queries must be an array'],
    ['rowActions', (value) => Array.isArray(value) || value === undefined, 'rowActions must be an array'],
    ['batchActions', (value) => Array.isArray(value) || value === undefined, 'batchActions must be an array'],
    ['entity', (value) => isPlainObject(value) || value === null || value === undefined, 'entity must be an object'],
    ['templateKey', (value) => typeof value === 'string' || value === null || value === undefined, 'templateKey must be a string'],
    ['actions', (value) => isPlainObject(value) || value === undefined, 'actions must be an object'],
  ]

  checks.forEach(([key, validator, message]) => {
    if (!validator(schema[key])) {
      errors.push(message)
    }
  })

  const datasourceMode = schema.datasource?.mode ?? schema.api?.mode
  if (datasourceMode !== undefined && !VALID_DATASOURCE_MODES.has(String(datasourceMode))) {
    errors.push('datasource.mode must be runtime or rest')
  }

  if (Array.isArray(schema.fields)) {
    const ids = new Set()
    const props = new Set()
    const numericProps = new Set()
    const dateProps = new Set()

    schema.fields.forEach((field, index) => {
      const prefix = `fields[${index}]`
      if (!isPlainObject(field)) {
        errors.push(`${prefix} must be an object`)
        return
      }
      if (!String(field.id || '').trim()) errors.push(`${prefix}.id is required`)
      else if (ids.has(field.id)) errors.push(`duplicate field id: ${field.id}`)
      else ids.add(field.id)
      if (!String(field.prop || '').trim()) errors.push(`${prefix}.prop is required`)
      else if (props.has(field.prop)) errors.push(`duplicate field prop: ${field.prop}`)
      else props.add(field.prop)
      if (!VALID_FIELD_TYPES.has(field.type)) errors.push(`${prefix}.type is invalid`)
      if (['number', 'slider', 'rate'].includes(field.type)) numericProps.add(String(field.prop))
      if (['date', 'datetime', 'time'].includes(field.type)) dateProps.add(String(field.prop))
      if (field.entityFieldId !== undefined && field.entityFieldId !== null && !Number.isInteger(field.entityFieldId)) {
        errors.push(`${prefix}.entityFieldId must be an integer`)
      }
      ;['searchable', 'tableVisible', 'formVisible', 'required'].forEach((key) => {
        if (key in field && typeof field[key] !== 'boolean') errors.push(`${prefix}.${key} must be a boolean`)
      })
      if (['select', 'radio', 'checkbox', 'cascader', 'tag'].includes(field.type)) {
        if (!Array.isArray(field.options)) {
          errors.push(`${prefix}.options must be an array`)
        } else {
          const values = new Set()
          field.options.forEach((option) => {
            if (!isPlainObject(option) || !String(option.label || '').trim()) errors.push(`${prefix}.options must include labels`)
            const value = String(option?.value ?? '')
            if (!value) errors.push(`${prefix}.options must include values`)
            else if (values.has(value)) errors.push(`${prefix}.options values must be unique`)
            else values.add(value)
          })
        }
      }
    })

    if (Array.isArray(schema.charts)) {
      schema.charts.forEach((chart, index) => validateChart(errors, chart, index, props, numericProps))
    }

    if (Array.isArray(schema.metrics)) {
      schema.metrics.forEach((metric, index) => validateMetric(errors, metric, index, props, numericProps, dateProps))
    }

    if (Array.isArray(schema.queries)) {
      schema.queries.forEach((query, index) => {
        if (!isPlainObject(query)) {
          errors.push(`queries[${index}] must be an object`)
          return
        }
        if (!props.has(query.fieldProp)) errors.push(`queries[${index}].fieldProp must reference a field prop`)
        if (!VALID_QUERY_OPERATORS.has(query.operator)) errors.push(`queries[${index}].operator is invalid`)
      })
    }

    if (Array.isArray(schema.rowActions)) {
      schema.rowActions.forEach((action, index) => validateAction(errors, action, `rowActions[${index}]`, VALID_ROW_ACTION_TYPES))
    }

    if (Array.isArray(schema.batchActions)) {
      schema.batchActions.forEach((action, index) => validateAction(errors, action, `batchActions[${index}]`, VALID_BATCH_ACTION_TYPES))
    }
  }

  return errors
}

export function validatePageSchema(schema = {}) {
  const errors = getPageSchemaValidationErrors(schema)
  return {
    valid: errors.length === 0,
    errors,
  }
}

export function normalizePageSchema(pageId = 'user_manage', schema = {}) {
  const defaultSchema = createDefaultPageSchema(pageId)
  const migratedSchema = migratePageSchema(pageId, schema)
  const source = isPlainObject(migratedSchema) ? migratedSchema : {}
  const rawFields = Array.isArray(source.fields) && source.fields.length > 0 ? source.fields : defaultSchema.fields
  const normalizedFields = rawFields.reduce((fields, field, index) => {
    fields.push(normalizeField(field, index + 1, fields))
    return fields
  }, [])
  const datasource = normalizeDatasource(pageId, source.datasource, source.api)

  return {
    ...defaultSchema,
    ...source,
    schemaVersion: SCHEMA_VERSION,
    id: String(source.id || pageId || defaultSchema.id),
    title: String(source.title || defaultSchema.title),
    pageType: String(source.pageType || defaultSchema.pageType),
    datasource,
    api: { ...datasource },
    actions: normalizeActions(source.actions),
    table: isPlainObject(source.table) ? { ...defaultSchema.table, ...source.table } : defaultSchema.table,
    formDialog: isPlainObject(source.formDialog)
      ? { ...defaultSchema.formDialog, ...source.formDialog }
      : defaultSchema.formDialog,
    fields: normalizedFields,
    charts: normalizeCharts(source.charts, defaultSchema.charts),
    metrics: normalizeMetrics(source.metrics),
    queries: normalizeQueries(source.queries),
    rowActions: normalizeActionsList(source.rowActions, 'row'),
    batchActions: normalizeActionsList(source.batchActions, 'batch'),
    entity: isPlainObject(source.entity) ? source.entity : null,
    templateKey: typeof source.templateKey === 'string' ? source.templateKey : null,
  }
}

export function clonePageSchema(schema) {
  return JSON.parse(JSON.stringify(schema))
}

export function normalizeActions(actions = {}) {
  const source = isPlainObject(actions) ? actions : {}
  return Object.keys(DEFAULT_PAGE_ACTIONS).reduce((result, key) => {
    result[key] = source[key] !== undefined ? Boolean(source[key]) : DEFAULT_PAGE_ACTIONS[key]
    return result
  }, {})
}

export function normalizeDatasource(pageId = 'user_manage', datasource = {}, legacyApi = {}) {
  const runtimeDatasource = buildRuntimeDatasource(pageId)
  const base = isPlainObject(datasource) ? datasource : isPlainObject(legacyApi) ? legacyApi : {}
  const mode = VALID_DATASOURCE_MODES.has(String(base.mode)) ? String(base.mode) : runtimeDatasource.mode

  return {
    ...runtimeDatasource,
    ...base,
    mode,
    requestBodyMode: base.requestBodyMode === 'plain' ? 'plain' : 'wrapped',
  }
}

export function normalizeQueries(queries = []) {
  return Array.isArray(queries)
    ? queries
        .filter((query) => isPlainObject(query))
        .map((query, index) => ({
          id: String(query.id || `query_${index + 1}`),
          label: String(query.label || ''),
          fieldProp: String(query.fieldProp || ''),
          paramKey: String(query.paramKey || query.fieldProp || ''),
          operator: VALID_QUERY_OPERATORS.has(query.operator) ? query.operator : 'contains',
          defaultValue: query.defaultValue ?? '',
        }))
    : []
}

export function normalizeActionsList(actions = [], scope = 'row') {
  const validTypes = scope === 'batch' ? VALID_BATCH_ACTION_TYPES : VALID_ROW_ACTION_TYPES
  return Array.isArray(actions)
    ? actions
        .filter((action) => isPlainObject(action))
        .map((action, index) => ({
          id: String(action.id || `${scope}_action_${index + 1}`),
          type: validTypes.has(action.type) ? action.type : scope === 'batch' ? 'request' : 'request',
          label: String(action.label || ''),
          method: action.method ? String(action.method).toUpperCase() : undefined,
          url: action.url ? String(action.url) : undefined,
          confirmText: action.confirmText ? String(action.confirmText) : '',
          successText: action.successText ? String(action.successText) : '',
          errorText: action.errorText ? String(action.errorText) : '',
          refreshAfterSuccess: action.refreshAfterSuccess !== undefined ? Boolean(action.refreshAfterSuccess) : true,
        }))
    : []
}

export function normalizeMetrics(metrics = []) {
  return Array.isArray(metrics)
    ? metrics.filter((metric) => isPlainObject(metric)).map((metric, index) => ({
        id: String(metric.id || `metric_${index + 1}`),
        title: String(metric.title || ''),
        type: VALID_METRIC_TYPES.has(metric.type) ? metric.type : 'total',
        field: metric.field ? String(metric.field) : '',
        value: metric.value ?? '',
        recentDays: Number(metric.recentDays) > 0 ? Number(metric.recentDays) : 30,
        prefix: metric.prefix ? String(metric.prefix) : '',
        suffix: metric.suffix ? String(metric.suffix) : '',
        precision: Number.isInteger(metric.precision) ? metric.precision : 0,
        tone: metric.tone ? String(metric.tone) : 'blue',
      }))
    : []
}

export function normalizeCharts(charts = [], fallback = []) {
  const source = Array.isArray(charts) && charts.length > 0 ? charts : fallback
  return source
    .filter((chart) => isPlainObject(chart))
    .map((chart, index) => ({
      id: String(chart.id || `chart_${index + 1}`),
      title: String(chart.title || ''),
      type: VALID_CHART_TYPES.has(chart.type) ? chart.type : 'pie',
      dimension: chart.dimension ? String(chart.dimension) : '',
      metric: VALID_CHART_METRICS.has(chart.metric) ? chart.metric : 'count',
      measureField: chart.measureField ? String(chart.measureField) : '',
      limit: Number(chart.limit) > 0 ? Number(chart.limit) : 8,
      sort: VALID_SORT_ORDERS.has(chart.sort) ? chart.sort : 'desc',
    }))
}

function validateAction(errors, action, prefix, validTypes) {
  if (!isPlainObject(action)) {
    errors.push(`${prefix} must be an object`)
    return
  }
  if (!validTypes.has(action.type)) {
    errors.push(`${prefix}.type is invalid`)
  }
  if (!String(action.label || '').trim()) {
    errors.push(`${prefix}.label is required`)
  }
  if (action.type === 'request' && !String(action.url || '').trim()) {
    errors.push(`${prefix}.url is required for request actions`)
  }
}

function validateMetric(errors, metric, index, props, numericProps, dateProps) {
  if (!isPlainObject(metric)) {
    errors.push(`metrics[${index}] must be an object`)
    return
  }
  if (!VALID_METRIC_TYPES.has(metric.type)) {
    errors.push(`metrics[${index}].type is invalid`)
    return
  }
  if (metric.type !== 'total' && !props.has(metric.field)) {
    errors.push(`metrics[${index}].field must reference a field prop`)
  }
  if (['sum', 'average', 'min', 'max', 'percent'].includes(metric.type) && !numericProps.has(metric.field)) {
    errors.push(`metrics[${index}].field must reference a numeric field`)
  }
  if (metric.type === 'recent' && !dateProps.has(metric.field)) {
    errors.push(`metrics[${index}].field must reference a date field`)
  }
  if (metric.type === 'percent' && metric.value === undefined) {
    errors.push(`metrics[${index}].value is required for percent metrics`)
  }
}

function validateChart(errors, chart, index, props, numericProps) {
  if (!isPlainObject(chart)) {
    errors.push(`charts[${index}] must be an object`)
    return
  }
  if (!VALID_CHART_TYPES.has(chart.type)) {
    errors.push(`charts[${index}].type is invalid`)
  }
  if (chart.type !== 'metric' && !props.has(chart.dimension)) {
    errors.push(`charts[${index}].dimension must reference a field prop`)
  }
  if (!VALID_CHART_METRICS.has(chart.metric || 'count')) {
    errors.push(`charts[${index}].metric is invalid`)
  }
  if ((chart.metric === 'sum' || chart.metric === 'average' || chart.metric === 'min' || chart.metric === 'max') && !numericProps.has(chart.measureField)) {
    errors.push(`charts[${index}].measureField must reference a numeric field`)
  }
}

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

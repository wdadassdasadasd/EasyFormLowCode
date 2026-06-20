import {
  buildRuntimeDatasource,
  createDefaultPageSchema,
  DEFAULT_PAGE_ACTIONS,
  SCHEMA_VERSION,
} from './defaultSchema'
import { normalizeField } from './fieldTypes'

const VALID_DATASOURCE_MODES = new Set(['runtime', 'rest'])
const VALID_FIELD_TYPES = new Set(['input', 'textarea', 'number', 'select', 'radio', 'date', 'switch'])

export function migratePageSchema(pageId = 'user_manage', schema = {}) {
  const source = isPlainObject(schema) ? clonePageSchema(schema) : {}
  const migrated = { ...source }

  if (!Number.isInteger(migrated.schemaVersion) || migrated.schemaVersion < SCHEMA_VERSION) {
    migrated.schemaVersion = SCHEMA_VERSION
  }

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
      ;['searchable', 'tableVisible', 'formVisible', 'required'].forEach((key) => {
        if (key in field && typeof field[key] !== 'boolean') errors.push(`${prefix}.${key} must be a boolean`)
      })
      if (['select', 'radio'].includes(field.type)) {
        if (!Array.isArray(field.options)) {
          errors.push(`${prefix}.options must be an array`)
          return
        }
        const values = new Set()
        field.options.forEach((option) => {
          if (!isPlainObject(option) || !String(option.label || '').trim()) errors.push(`${prefix}.options must include labels`)
          const value = String(option?.value ?? '')
          if (!value) errors.push(`${prefix}.options must include values`)
          else if (values.has(value)) errors.push(`${prefix}.options values must be unique`)
          else values.add(value)
        })
      }
    })
    if (Array.isArray(schema.charts)) {
      schema.charts.forEach((chart, index) => {
        if (!isPlainObject(chart)) errors.push(`charts[${index}] must be an object`)
        else if (chart.type !== 'metric' && !props.has(chart.dimension)) errors.push(`charts[${index}].dimension must reference a field prop`)
      })
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
    charts: Array.isArray(source.charts) && source.charts.length > 0 ? source.charts : defaultSchema.charts,
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
  }
}

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

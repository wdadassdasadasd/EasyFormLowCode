import {
  buildRuntimeDatasource,
  createDefaultPageSchema,
  DEFAULT_PAGE_ACTIONS,
  SCHEMA_VERSION,
} from './defaultSchema'
import { normalizeField } from './fieldTypes'

const VALID_DATASOURCE_MODES = new Set(['runtime', 'rest'])

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

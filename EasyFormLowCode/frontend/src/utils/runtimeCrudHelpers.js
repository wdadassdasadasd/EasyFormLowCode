import { buildFieldRules, getFieldInitialValue } from '../schema/fieldTypes'

export function getDatasourceCapabilities(datasource = {}) {
  const isExternalRest = datasource?.mode === 'rest'
  const writeEnabled = Boolean(datasource?.restWriteEnabled)
  return {
    read: true,
    create: !isExternalRest || (writeEnabled && Boolean(datasource?.createUrl)),
    update: !isExternalRest || (writeEnabled && Boolean(datasource?.updateUrl)),
    delete: !isExternalRest || (writeEnabled && Boolean(datasource?.deleteUrl)),
    batchDelete: !isExternalRest,
    stats: !isExternalRest,
    customRequest: !isExternalRest || Boolean(datasource?.listUrl),
  }
}

export function buildSearchFilters(searchableFields = [], searchModel = {}, queries = []) {
  const queryList = Array.isArray(queries) ? queries : []
  if (queryList.length > 0) {
    return queryList.reduce((result, query) => {
      const value = searchModel[query.id]
      if (value !== '' && value !== undefined && value !== null) {
        result[query.paramKey || query.fieldProp] = value
      }
      return result
    }, {})
  }

  return searchableFields.reduce((result, field) => {
    const value = searchModel[field.prop]
    if (value !== '' && value !== undefined && value !== null) {
      result[field.prop] = value
    }
    return result
  }, {})
}

export function buildPlainRecord(formFields = [], source = {}) {
  return formFields.reduce((record, field) => {
    record[field.prop] = source[field.prop]
    return record
  }, {})
}

export function buildFormValues(formFields = [], source = {}) {
  return formFields.reduce((result, field) => {
    result[field.prop] = source[field.prop] ?? getFieldInitialValue(field)
    return result
  }, {})
}

export function validateRecord(formFields = [], source = {}) {
  return formFields.reduce(
    (state, field) => {
      const value = source[field.prop]
      const failedRule = buildFieldRules(field).find((rule) => !rule.validator(value))
      if (failedRule) {
        state.valid = false
        state.errors[field.prop] = failedRule.message
      } else {
        state.errors[field.prop] = ''
      }
      return state
    },
    { valid: true, errors: {} },
  )
}

export function applyFormErrors(target, nextErrors = {}) {
  Object.keys(target).forEach((key) => {
    target[key] = nextErrors[key] || ''
  })
}

export function resetFieldValues(target, fields, source = {}) {
  fields.forEach((field) => {
    target[field.prop] = source[field.prop] ?? getFieldInitialValue(field)
  })
}

export function classifyRequestFailure(request = {}) {
  if (!request) return ''
  if (request.ok) return ''
  if (request.configError) return '閰嶇疆缂哄け'
  if (request.mappingError) return '杩斿洖浣撶己灏戞槧灏勫瓧娈?'
  if (request.networkError) return '缃戠粶澶辫触'
  if (request.status && Number(request.status) >= 400) return 'HTTP 4xx/5xx'
  return '鏈煡澶辫触'
}

export function summarizeResponse(request = {}) {
  if (request.error) return request.error
  if (request.payload === undefined || request.payload === null) return 'OK'
  if (Array.isArray(request.payload)) return `Array(${request.payload.length})`
  if (typeof request.payload === 'object') return Object.keys(request.payload).slice(0, 6).join(', ') || 'Object'
  return String(request.payload)
}

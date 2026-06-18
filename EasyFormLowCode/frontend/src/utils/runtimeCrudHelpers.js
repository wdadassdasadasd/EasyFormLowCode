import { buildFieldRules, getFieldInitialValue } from '../schema/fieldTypes'

export function buildSearchFilters(searchableFields = [], searchModel = {}) {
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

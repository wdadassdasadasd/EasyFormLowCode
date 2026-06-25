import { computed, reactive } from 'vue'

import { getFieldInitialValue, getFieldsByUsage } from '../schema/fieldTypes'

export function useSchemaModels(pageSchema) {
  const searchModel = reactive({})
  const dialogForm = reactive({})
  const formErrors = reactive({})

  const queryItems = computed(() => Array.isArray(pageSchema.queries) ? pageSchema.queries : [])
  const searchableFields = computed(() => {
    if (queryItems.value.length > 0) {
      return queryItems.value
        .map((query) => pageSchema.fields.find((field) => field.prop === query.fieldProp))
        .filter(Boolean)
    }
    return getFieldsByUsage(pageSchema.fields, 'search')
  })
  const tableFields = computed(() => getFieldsByUsage(pageSchema.fields, 'table'))
  const formFields = computed(() => getFieldsByUsage(pageSchema.fields, 'form'))

  function syncModels() {
    syncSearchModel()
    syncObjectKeys(dialogForm, formFields.value)
    syncObjectKeys(formErrors, formFields.value, '')
  }

  function syncSearchModel() {
    if (queryItems.value.length > 0) {
      Object.keys(searchModel).forEach((key) => {
        if (!queryItems.value.some((query) => query.id === key)) {
          delete searchModel[key]
        }
      })
      queryItems.value.forEach((query) => {
        if (!(query.id in searchModel)) {
          searchModel[query.id] = query.defaultValue ?? ''
        }
      })
      return
    }

    syncObjectKeys(searchModel, searchableFields.value, '')
  }

  function syncObjectKeys(target, fields, emptyValue) {
    Object.keys(target).forEach((key) => {
      if (!fields.some((field) => field.prop === key)) {
        delete target[key]
      }
    })

    fields.forEach((field) => {
      if (!(field.prop in target)) {
        target[field.prop] = emptyValue !== undefined ? emptyValue : getFieldInitialValue(field)
      }
    })
  }

  return {
    searchModel,
    dialogForm,
    formErrors,
    searchableFields,
    tableFields,
    formFields,
    queryItems,
    syncModels,
  }
}

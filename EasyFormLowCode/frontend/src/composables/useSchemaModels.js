import { computed, reactive } from 'vue'

import { getFieldInitialValue, getFieldsByUsage } from '../schema/fieldTypes'

export function useSchemaModels(pageSchema) {
  const searchModel = reactive({})
  const dialogForm = reactive({})
  const formErrors = reactive({})

  const searchableFields = computed(() => getFieldsByUsage(pageSchema.fields, 'search'))
  const tableFields = computed(() => getFieldsByUsage(pageSchema.fields, 'table'))
  const formFields = computed(() => getFieldsByUsage(pageSchema.fields, 'form'))

  function syncModels() {
    syncObjectKeys(searchModel, searchableFields.value)
    syncObjectKeys(dialogForm, formFields.value)
    syncObjectKeys(formErrors, formFields.value, '')
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
    syncModels,
  }
}

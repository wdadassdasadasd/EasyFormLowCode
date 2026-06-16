import { createDefaultPageSchema } from './defaultSchema'
import { normalizeField } from './fieldTypes'

export function normalizePageSchema(pageId = 'user_manage', schema = {}) {
  const defaultSchema = createDefaultPageSchema(pageId)
  const source = schema && typeof schema === 'object' ? schema : {}
  const rawFields = Array.isArray(source.fields) && source.fields.length > 0 ? source.fields : defaultSchema.fields
  const normalizedFields = rawFields.reduce((fields, field, index) => {
    fields.push(normalizeField(field, index + 1, fields))
    return fields
  }, [])

  return {
    ...defaultSchema,
    ...source,
    id: String(source.id || pageId || defaultSchema.id),
    title: String(source.title || defaultSchema.title),
    pageType: String(source.pageType || defaultSchema.pageType),
    api: typeof source.api === 'object' && source.api !== null ? source.api : defaultSchema.api,
    table: typeof source.table === 'object' && source.table !== null ? source.table : defaultSchema.table,
    formDialog:
      typeof source.formDialog === 'object' && source.formDialog !== null ? source.formDialog : defaultSchema.formDialog,
    fields: normalizedFields,
    charts: Array.isArray(source.charts) && source.charts.length > 0 ? source.charts : defaultSchema.charts,
  }
}

export function clonePageSchema(schema) {
  return JSON.parse(JSON.stringify(schema))
}

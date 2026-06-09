import { createFieldByType, ensureUniqueProp } from './fieldTypes'

export const FIELD_DROP_AREAS = {
  search: 'search',
  table: 'table',
  form: 'form',
}

const AREA_VISIBILITY_FLAGS = {
  [FIELD_DROP_AREAS.search]: 'searchable',
  [FIELD_DROP_AREAS.table]: 'tableVisible',
  [FIELD_DROP_AREAS.form]: 'formVisible',
}

export function createDroppedField(type = 'input', area = FIELD_DROP_AREAS.table, fields = []) {
  const fieldType = typeof type === 'object' ? type.type : type
  const field = createFieldByType(fieldType, {}, fields.length + 1)
  const visibilityFlag = AREA_VISIBILITY_FLAGS[area]

  field.prop = ensureUniqueProp(field.prop, field.id, fields)

  if (visibilityFlag) {
    field[visibilityFlag] = true
  }

  return field
}

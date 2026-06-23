import { ensureUniqueProp, normalizeProp } from '../schema/fieldTypes'
import { getDatasourceCapabilities } from './runtimeCrudHelpers'

export function normalizeEditableFieldProp(rawProp, fieldId, fields = [], fallback = 'field') {
  const input = String(rawProp ?? '').trim()
  const normalized = normalizeProp(input, fallback)
  const value = ensureUniqueProp(normalized, fieldId, fields)

  if (!input) {
    return {
      value,
      message: `Prop 不能为空，已自动补全为 ${value}`,
    }
  }

  if (normalized !== input) {
    return {
      value,
      message: `Prop 仅支持字母、数字和下划线，已自动规范为 ${value}`,
    }
  }

  if (value !== normalized) {
    return {
      value,
      message: `Prop 已存在，已自动调整为 ${value}`,
    }
  }

  return {
    value,
    message: '',
  }
}

export function applyDatasourceCapabilityToActions(actions = {}, datasource = {}) {
  const capabilities = getDatasourceCapabilities(datasource)

  return {
    ...actions,
    create: capabilities.create && Boolean(actions.create),
    edit: capabilities.update && Boolean(actions.edit),
    delete: capabilities.delete && Boolean(actions.delete),
    batchDelete: capabilities.batchDelete && Boolean(actions.batchDelete),
  }
}

import { reactive, ref, unref } from 'vue'

import { getPage, getPublishedPage } from '../api/pages'
import { listReferenceOptions } from '../api/entities'
import { getDefaultPageSchema, normalizePageSchemaContract } from '../api/schemaContract'
import { DEFAULT_PAGE_ID } from '../config/appConfig'
import { clonePageSchema, normalizePageSchema } from '../schema/pageSchema'

export function usePageSchema({ pageId = DEFAULT_PAGE_ID, syncModels, afterReplace } = {}) {
  const initialPageId = resolvePageId(pageId)
  const pageSchema = reactive(normalizePageSchema(initialPageId))
  const pageStatus = ref('draft')
  const publishedVersionNo = ref(null)
  const publishedAt = ref('')
  const schemaLoading = ref(false)
  const schemaError = ref('')
  const schemaOffline = ref(false)

  function replaceSchema(nextSchema) {
    const normalized = normalizePageSchema(resolvePageId(pageId), nextSchema)
    Object.keys(pageSchema).forEach((key) => {
      delete pageSchema[key]
    })
    Object.assign(pageSchema, normalized)
    syncModels?.()
    afterReplace?.(pageSchema)
  }

  async function loadSchema({ published = false } = {}) {
    schemaLoading.value = true
    schemaError.value = ''
    schemaOffline.value = false

    try {
      const result = await (published ? getPublishedPage : getPage)(resolvePageId(pageId))
      replaceSchema(await normalizeSchema(result.schema_json))
      await hydrateRelationOptions()
      pageStatus.value = result.status
      publishedVersionNo.value = result.published_version_no ?? null
      publishedAt.value = result.published_at || ''
      return result
    } catch (error) {
      replaceSchema(await loadFallbackSchema())
      pageStatus.value = 'draft'
      publishedVersionNo.value = null
      publishedAt.value = ''
      schemaError.value = error?.message || 'Failed to load PageSchema'
      schemaOffline.value = true
      return null
    } finally {
      schemaLoading.value = false
    }
  }

  function toPlainSchema() {
    return normalizePageSchema(resolvePageId(pageId), clonePageSchema(pageSchema))
  }

  async function normalizeSchema(nextSchema) {
    try {
      const result = await normalizePageSchemaContract(resolvePageId(pageId), nextSchema)
      return result.schema_json
    } catch {
      return normalizePageSchema(resolvePageId(pageId), nextSchema)
    }
  }

  async function loadFallbackSchema() {
    try {
      const result = await getDefaultPageSchema(resolvePageId(pageId))
      return result.schema_json
    } catch {
      return normalizePageSchema(resolvePageId(pageId))
    }
  }

  async function hydrateRelationOptions() {
    const entityId = pageSchema.entity?.id
    if (!entityId) return
    const relationFields = pageSchema.fields.filter((field) => field.relation?.fieldId)
    await Promise.all(relationFields.map(async (field) => {
      try {
        field.relationOptions = await listReferenceOptions(entityId, field.relation.fieldId)
      } catch {
        field.relationOptions = []
      }
    }))
  }

  return {
    pageSchema,
    pageStatus,
    publishedVersionNo,
    publishedAt,
    schemaLoading,
    schemaError,
    schemaOffline,
    replaceSchema,
    loadSchema,
    normalizeSchema,
    toPlainSchema,
  }
}

function resolvePageId(pageId) {
  return String(unref(pageId) || DEFAULT_PAGE_ID)
}

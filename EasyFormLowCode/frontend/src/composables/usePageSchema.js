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
  const schemaRevision = ref(null)
  const schemaLoading = ref(false)
  const schemaError = ref('')
  const schemaOffline = ref(false)
  let schemaRequestId = 0
  let schemaAbortController = null

  function replaceSchema(nextSchema) {
    const normalized = normalizePageSchema(resolvePageId(pageId), nextSchema)
    Object.keys(pageSchema).forEach((key) => {
      delete pageSchema[key]
    })
    Object.assign(pageSchema, normalized)
    syncModels?.()
    afterReplace?.(pageSchema)
  }

  function applyPageMetadata(result = {}) {
    pageStatus.value = result.status || 'draft'
    publishedVersionNo.value = result.published_version_no ?? null
    publishedAt.value = result.published_at || ''
    schemaRevision.value = Number.isInteger(result.schema_revision) ? result.schema_revision : null
  }

  function applyPageResult(result, { replace = true } = {}) {
    if (replace && result?.schema_json) {
      replaceSchema(result.schema_json)
    }
    applyPageMetadata(result)
  }

  function cancelSchemaLoad() {
    schemaAbortController?.abort()
    schemaAbortController = null
  }

  async function loadSchema({ published = false } = {}) {
    const requestId = ++schemaRequestId
    cancelSchemaLoad()
    const controller = new AbortController()
    schemaAbortController = controller
    const isCurrentRequest = () => requestId === schemaRequestId && schemaAbortController === controller

    schemaLoading.value = true
    schemaError.value = ''
    schemaOffline.value = false

    try {
      const result = await (published ? getPublishedPage : getPage)(resolvePageId(pageId), { signal: controller.signal })
      const normalizedSchema = await normalizeSchema(result.schema_json, { signal: controller.signal })
      if (!isCurrentRequest()) return { aborted: true }
      replaceSchema(normalizedSchema)
      await hydrateRelationOptions({ signal: controller.signal, isCurrentRequest })
      if (!isCurrentRequest()) return { aborted: true }
      applyPageMetadata(result)
      return result
    } catch (error) {
      if (!isCurrentRequest() || isAbortError(error)) return { aborted: true }
      let fallbackSchema
      try {
        fallbackSchema = await loadFallbackSchema({ signal: controller.signal })
      } catch (fallbackError) {
        if (!isCurrentRequest() || isAbortError(fallbackError)) return { aborted: true }
        throw fallbackError
      }
      if (!isCurrentRequest()) return { aborted: true }
      replaceSchema(fallbackSchema)
      applyPageMetadata({ status: 'draft' })
      schemaError.value = error?.message || 'Failed to load PageSchema'
      schemaOffline.value = true
      return null
    } finally {
      if (isCurrentRequest()) {
        schemaLoading.value = false
        schemaAbortController = null
      }
    }
  }

  function toPlainSchema() {
    return normalizePageSchema(resolvePageId(pageId), clonePageSchema(pageSchema))
  }

  async function normalizeSchema(nextSchema, { signal } = {}) {
    try {
      const result = await normalizePageSchemaContract(resolvePageId(pageId), nextSchema, { signal })
      return result.schema_json
    } catch (error) {
      if (isAbortError(error)) throw error
      return normalizePageSchema(resolvePageId(pageId), nextSchema)
    }
  }

  async function loadFallbackSchema({ signal } = {}) {
    try {
      const result = await getDefaultPageSchema(resolvePageId(pageId), { signal })
      return result.schema_json
    } catch (error) {
      if (isAbortError(error)) throw error
      return normalizePageSchema(resolvePageId(pageId))
    }
  }

  async function hydrateRelationOptions({ signal, isCurrentRequest = () => true } = {}) {
    const entityId = pageSchema.entity?.id
    if (!entityId) return
    const relationFields = pageSchema.fields.filter((field) => field.relation?.fieldId)
    await Promise.all(relationFields.map(async (field) => {
      try {
        const options = await listReferenceOptions(entityId, field.relation.fieldId, '', { signal })
        if (isCurrentRequest()) {
          field.relationOptions = options
        }
      } catch (error) {
        if (!isAbortError(error) && isCurrentRequest()) {
          field.relationOptions = []
        }
      }
    }))
  }

  return {
    pageSchema,
    pageStatus,
    publishedVersionNo,
    publishedAt,
    schemaRevision,
    schemaLoading,
    schemaError,
    schemaOffline,
    replaceSchema,
    applyPageMetadata,
    applyPageResult,
    cancelSchemaLoad,
    loadSchema,
    normalizeSchema,
    toPlainSchema,
  }
}

function resolvePageId(pageId) {
  return String(unref(pageId) || DEFAULT_PAGE_ID)
}

function isAbortError(error) {
  return error?.name === 'AbortError' || error?.code === 'ABORT_ERR'
}

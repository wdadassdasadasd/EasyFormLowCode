import { reactive, ref, unref } from 'vue'

import { getPage, getPublishedPage } from '../api/pages'
import { DEFAULT_PAGE_ID } from '../config/appConfig'
import { clonePageSchema, normalizePageSchema } from '../schema/pageSchema'

export function usePageSchema({ pageId = DEFAULT_PAGE_ID, syncModels, afterReplace } = {}) {
  const initialPageId = resolvePageId(pageId)
  const pageSchema = reactive(normalizePageSchema(initialPageId))
  const pageStatus = ref('draft')
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
      replaceSchema(result.schema_json)
      pageStatus.value = result.status
      return result
    } catch (error) {
      replaceSchema(normalizePageSchema(resolvePageId(pageId)))
      pageStatus.value = 'draft'
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

  return {
    pageSchema,
    pageStatus,
    schemaLoading,
    schemaError,
    schemaOffline,
    replaceSchema,
    loadSchema,
    toPlainSchema,
  }
}

function resolvePageId(pageId) {
  return String(unref(pageId) || DEFAULT_PAGE_ID)
}

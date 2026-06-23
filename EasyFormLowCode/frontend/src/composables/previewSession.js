import { clonePageSchema } from '../schema/pageSchema'

const previews = new Map()

export function setLocalPreview(pageId, schema) {
  previews.set(String(pageId), clonePageSchema(schema))
}

export function getLocalPreview(pageId) {
  const schema = previews.get(String(pageId))
  return schema ? clonePageSchema(schema) : null
}

export function clearLocalPreview(pageId) {
  previews.delete(String(pageId))
}

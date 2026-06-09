import { apiRequest } from './httpClient'

export function getPage(pageId) {
  return apiRequest(`/pages/${pageId}`)
}

export function savePageSchema(pageId, payload) {
  return apiRequest(`/pages/${pageId}/schema`, {
    method: 'PUT',
    body: payload,
  })
}

export function publishPage(pageId) {
  return apiRequest(`/pages/${pageId}/publish`, {
    method: 'POST',
  })
}

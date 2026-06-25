import { apiRequest } from './httpClient'

export function listPages() {
  return apiRequest('/pages')
}

export function getPage(pageId) {
  return apiRequest(`/pages/${pageId}`)
}

export function getPublishedPage(pageId) {
  return apiRequest(`/pages/${pageId}/published`)
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

export function syncEntityPage(pageId) {
  return apiRequest(`/pages/${pageId}/sync-entity`, { method: 'POST' })
}

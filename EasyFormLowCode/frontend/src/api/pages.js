import { apiRequest } from './httpClient'

export function listPages() {
  return apiRequest('/pages')
}

export function getPage(pageId, { signal } = {}) {
  return apiRequest(`/pages/${pageId}`, { signal })
}

export function getPublishedPage(pageId, { signal } = {}) {
  return apiRequest(`/pages/${pageId}/published`, { signal })
}

export function savePageSchema(pageId, payload) {
  return apiRequest(`/pages/${pageId}/schema`, {
    method: 'PUT',
    body: payload,
  })
}

export function publishPage(pageId, expectedRevision) {
  return apiRequest(`/pages/${pageId}/publish`, {
    method: 'POST',
    body: { expected_revision: expectedRevision },
  })
}

export function syncEntityPage(pageId, expectedRevision) {
  return apiRequest(`/pages/${pageId}/sync-entity`, {
    method: 'POST',
    body: { expected_revision: expectedRevision },
  })
}

import { apiRequest } from './httpClient'

export function listPageVersions(pageId) {
  return apiRequest(`/pages/${pageId}/versions`)
}

export function restorePageVersion(pageId, versionId, expectedRevision) {
  return apiRequest(`/pages/${pageId}/versions/${versionId}/restore`, {
    method: 'POST',
    body: { expected_revision: expectedRevision },
  })
}

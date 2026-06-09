import { apiRequest } from './httpClient'

export function listPageVersions(pageId) {
  return apiRequest(`/pages/${pageId}/versions`)
}

export function restorePageVersion(pageId, versionId) {
  return apiRequest(`/pages/${pageId}/versions/${versionId}/restore`, {
    method: 'POST',
  })
}

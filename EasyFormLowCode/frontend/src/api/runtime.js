import { apiRequest } from './httpClient'

export function listRuntimeRecords(pageId, { page, pageSize, filters = {} } = {}) {
  return apiRequest(`/runtime/pages/${pageId}/records`, {
    params: {
      page,
      pageSize,
      ...filters,
    },
  })
}

export function getRuntimeStats(pageId, { filters = {} } = {}) {
  return apiRequest(`/runtime/pages/${pageId}/stats`, {
    params: filters,
  })
}

export function createRuntimeRecord(pageId, data) {
  return apiRequest(`/runtime/pages/${pageId}/records`, {
    method: 'POST',
    body: { data },
  })
}

export function updateRuntimeRecord(pageId, recordId, data) {
  return apiRequest(`/runtime/pages/${pageId}/records/${recordId}`, {
    method: 'PUT',
    body: { data },
  })
}

export function deleteRuntimeRecord(pageId, recordId) {
  return apiRequest(`/runtime/pages/${pageId}/records/${recordId}`, {
    method: 'DELETE',
  })
}

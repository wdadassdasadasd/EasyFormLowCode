import { apiRequest } from './httpClient'

export function listProjectEntities(projectId) {
  return apiRequest(`/projects/${projectId}/entities`)
}

export function createEntity(projectId, payload) {
  return apiRequest(`/projects/${projectId}/entities`, { method: 'POST', body: payload })
}

export function getEntity(entityId) {
  return apiRequest(`/entities/${entityId}`)
}

export function updateEntity(entityId, payload) {
  return apiRequest(`/entities/${entityId}`, { method: 'PATCH', body: payload })
}

export function deleteEntity(entityId) {
  return apiRequest(`/entities/${entityId}`, { method: 'DELETE' })
}

export function createEntityField(entityId, payload) {
  return apiRequest(`/entities/${entityId}/fields`, { method: 'POST', body: payload })
}

export function updateEntityField(entityId, fieldId, payload) {
  return apiRequest(`/entities/${entityId}/fields/${fieldId}`, { method: 'PATCH', body: payload })
}

export function deleteEntityField(entityId, fieldId) {
  return apiRequest(`/entities/${entityId}/fields/${fieldId}`, { method: 'DELETE' })
}

export function createEntityRelation(entityId, payload) {
  return apiRequest(`/entities/${entityId}/relations`, { method: 'POST', body: payload })
}

export function listReferenceOptions(entityId, fieldId, search = '', { signal } = {}) {
  return apiRequest(`/entities/${entityId}/fields/${fieldId}/reference-options`, { params: { search }, signal })
}

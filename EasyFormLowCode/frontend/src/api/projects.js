import { apiRequest } from './httpClient'

export function listProjects() {
  return apiRequest('/projects')
}

export function createProject(payload) {
  return apiRequest('/projects', { method: 'POST', body: payload })
}

export function updateProject(projectId, payload) {
  return apiRequest(`/projects/${projectId}`, { method: 'PATCH', body: payload })
}

export function listProjectPages(projectId) {
  return apiRequest(`/projects/${projectId}/pages`)
}

export function createProjectPage(projectId, payload) {
  return apiRequest(`/projects/${projectId}/pages`, { method: 'POST', body: payload })
}

export function updatePageMetadata(pageId, payload) {
  return apiRequest(`/pages/${pageId}/metadata`, { method: 'PATCH', body: payload })
}

export function deleteProjectPage(pageId) {
  return apiRequest(`/pages/${pageId}`, { method: 'DELETE' })
}

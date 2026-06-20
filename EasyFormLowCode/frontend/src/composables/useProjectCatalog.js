import { computed, ref } from 'vue'

import {
  createProject,
  createProjectPage,
  deleteProjectPage,
  listProjectPages,
  listProjects,
  updatePageMetadata,
  updateProject,
} from '../api/projects'

export function useProjectCatalog() {
  const projects = ref([])
  const pages = ref([])
  const catalogLoading = ref(false)
  const catalogError = ref('')
  const activeProjectId = ref(null)
  const activeProject = computed(() => projects.value.find((project) => project.id === activeProjectId.value) || null)

  async function loadProjects(preferredProjectId) {
    catalogLoading.value = true
    catalogError.value = ''
    try {
      projects.value = await listProjects()
      const requested = Number(preferredProjectId)
      const nextProject = projects.value.find((project) => project.id === requested) || projects.value[0]
      activeProjectId.value = nextProject?.id || null
      if (activeProjectId.value) {
        await loadPages(activeProjectId.value)
      } else {
        pages.value = []
      }
      return activeProjectId.value
    } catch (error) {
      catalogError.value = error?.message || '项目列表加载失败'
      return null
    } finally {
      catalogLoading.value = false
    }
  }

  async function loadPages(projectId = activeProjectId.value) {
    if (!projectId) {
      pages.value = []
      return []
    }
    try {
      catalogError.value = ''
      activeProjectId.value = Number(projectId)
      pages.value = await listProjectPages(activeProjectId.value)
      return pages.value
    } catch (error) {
      catalogError.value = error?.message || '页面列表加载失败'
      pages.value = []
      return []
    }
  }

  async function addProject(name) {
    const project = await createProject({ name })
    await loadProjects(project.id)
    return project
  }

  async function renameProject(projectId, name) {
    const project = await updateProject(projectId, { name })
    await loadProjects(projectId)
    return project
  }

  async function addPage(projectId, payload) {
    const page = await createProjectPage(projectId, payload)
    await loadProjects(projectId)
    return page
  }

  async function renamePage(pageId, name) {
    const page = await updatePageMetadata(pageId, { name })
    await loadPages()
    return page
  }

  async function removePage(pageId) {
    await deleteProjectPage(pageId)
    await loadPages()
  }

  return {
    projects,
    pages,
    catalogLoading,
    catalogError,
    activeProjectId,
    activeProject,
    loadProjects,
    loadPages,
    addProject,
    renameProject,
    addPage,
    renamePage,
    removePage,
  }
}

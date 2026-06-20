export function resolveSelectedPageId(routePageId, pages = []) {
  const normalizedRoutePageId = routePageId ? String(routePageId) : ''
  if (normalizedRoutePageId && pages.some((page) => page.page_id === normalizedRoutePageId)) {
    return normalizedRoutePageId
  }

  return pages[0]?.page_id || ''
}

export function buildProjectRouteQuery(routeQuery = {}, projectId, pages = []) {
  const normalizedProjectId = Number(projectId) || undefined
  if (!normalizedProjectId) {
    return null
  }

  const nextPageId = resolveSelectedPageId(routeQuery.pageId, pages)
  const currentProjectId = Number(routeQuery.projectId) || undefined
  const currentPageId = routeQuery.pageId ? String(routeQuery.pageId) : ''

  if (currentProjectId === normalizedProjectId && currentPageId === nextPageId) {
    return null
  }

  return {
    ...routeQuery,
    projectId: normalizedProjectId,
    pageId: nextPageId || undefined,
  }
}

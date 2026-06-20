import { describe, expect, it } from 'vitest'

import { buildProjectRouteQuery, resolveSelectedPageId } from '../../../frontend/src/composables/projectRouteState'

describe('projectRouteState', () => {
  const pages = [{ page_id: 'users' }, { page_id: 'roles' }]

  it('falls back to the first page when the route points to a deleted page', () => {
    expect(resolveSelectedPageId('missing', pages)).toBe('users')
  })

  it('returns null when the query is already aligned', () => {
    expect(buildProjectRouteQuery({ projectId: '3', pageId: 'roles' }, 3, pages)).toBeNull()
  })

  it('rewrites stale page ids to the next available page', () => {
    expect(buildProjectRouteQuery({ projectId: '3', pageId: 'missing' }, 3, pages)).toEqual({
      projectId: 3,
      pageId: 'users',
    })
  })

  it('clears pageId when the selected project has no pages', () => {
    expect(buildProjectRouteQuery({ projectId: '3', pageId: 'missing' }, 3, [])).toEqual({
      projectId: 3,
      pageId: undefined,
    })
  })
})

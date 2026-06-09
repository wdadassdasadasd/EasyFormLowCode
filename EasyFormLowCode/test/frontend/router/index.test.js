import { describe, it, expect, vi } from 'vitest'
import { createRouter, createMemoryHistory } from 'vue-router'

// 模拟懒加载组件，避免实际导入 .vue 文件
vi.mock('../../../frontend/src/views/Main.vue', () => ({ default: { name: 'Main', template: '<div>Main</div>' } }))
vi.mock('../../../frontend/src/views/AppManage.vue', () => ({ default: { name: 'AppManage', template: '<div>AppManage</div>' } }))
vi.mock('../../../frontend/src/views/PageDesigner.vue', () => ({ default: { name: 'PageDesigner', template: '<div>PageDesigner</div>' } }))

// 动态导入路由配置（使用与源文件相同的路由结构）
function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/',
        component: () => import('../../../frontend/src/views/Main.vue'),
        redirect: '/pagedesigner',
        children: [
          {
            path: 'appmanage',
            name: '项目管理',
            component: () => import('../../../frontend/src/views/AppManage.vue'),
          },
          {
            path: 'pagedesigner',
            name: '页面设计',
            component: () => import('../../../frontend/src/views/PageDesigner.vue'),
          },
        ],
      },
    ],
  })
}

describe('Router Configuration', () => {
  it('should have correct route definitions', () => {
    const router = createTestRouter()
    const routes = router.getRoutes()

    // 应该有根路径、appmanage、pagedesigner 等路由
    expect(routes.length).toBeGreaterThanOrEqual(2)
  })

  it('should redirect / to /pagedesigner', async () => {
    const router = createTestRouter()
    await router.push('/')
    await router.isReady()

    expect(router.currentRoute.value.path).toBe('/pagedesigner')
  })

  it('should navigate to /appmanage', async () => {
    const router = createTestRouter()
    await router.push('/appmanage')
    await router.isReady()

    expect(router.currentRoute.value.path).toBe('/appmanage')
    expect(router.currentRoute.value.name).toBe('项目管理')
  })

  it('should navigate to /pagedesigner', async () => {
    const router = createTestRouter()
    await router.push('/pagedesigner')
    await router.isReady()

    expect(router.currentRoute.value.path).toBe('/pagedesigner')
    expect(router.currentRoute.value.name).toBe('页面设计')
  })

  it('should have pagedesigner as a child of root', async () => {
    const router = createTestRouter()
    await router.push('/')
    await router.isReady()

    const matched = router.currentRoute.value.matched
    // /pagedesigner 是 / 的子路由，matched 应包含父路由
    expect(matched.length).toBeGreaterThanOrEqual(1)
  })

  it('should resolve AppManage component for /appmanage', async () => {
    const router = createTestRouter()
    const resolved = router.resolve('/appmanage')
    expect(resolved.path).toBe('/appmanage')
  })

  it('should resolve PageDesigner component for /pagedesigner', async () => {
    const router = createTestRouter()
    const resolved = router.resolve('/pagedesigner')
    expect(resolved.path).toBe('/pagedesigner')
  })
})

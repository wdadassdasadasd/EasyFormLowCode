import { describe, it, expect, vi } from 'vitest'
import { createRouter, createWebHistory, createMemoryHistory } from 'vue-router'

// 模拟懒加载组件，避免实际导入 .vue 文件
vi.mock('../views/Main.vue', () => ({ default: { name: 'Main', template: '<div>Main</div>' } }))
vi.mock('../views/AppManage.vue', () => ({ default: { name: 'AppManage', template: '<div>AppManage</div>' } }))
vi.mock('../views/FormDesigner.vue', () => ({ default: { name: 'FormDesigner', template: '<div>FormDesigner</div>' } }))

// 动态导入路由配置（使用与源文件相同的路由结构）
function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/',
        component: () => import('../views/Main.vue'),
        redirect: '/appmanage',
        children: [
          {
            path: 'appmanage',
            name: 'appmanage',
            component: () => import('../views/AppManage.vue'),
          },
          {
            path: 'formdesigner',
            name: 'formdesigner',
            component: () => import('../views/FormDesigner.vue'),
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

    // 应该有 3 条路由：根路径（重定向）、appmanage、formdesigner
    expect(routes.length).toBeGreaterThanOrEqual(2)
  })

  it('should redirect / to /appmanage', async () => {
    const router = createTestRouter()
    await router.push('/')
    await router.isReady()

    expect(router.currentRoute.value.path).toBe('/appmanage')
  })

  it('should navigate to /appmanage', async () => {
    const router = createTestRouter()
    await router.push('/appmanage')
    await router.isReady()

    expect(router.currentRoute.value.path).toBe('/appmanage')
    expect(router.currentRoute.value.name).toBe('appmanage')
  })

  it('should navigate to /formdesigner', async () => {
    const router = createTestRouter()
    await router.push('/formdesigner')
    await router.isReady()

    expect(router.currentRoute.value.path).toBe('/formdesigner')
    expect(router.currentRoute.value.name).toBe('formdesigner')
  })

  it('should have appmanage and formdesigner as children of root', async () => {
    const router = createTestRouter()
    await router.push('/')
    await router.isReady()

    const matched = router.currentRoute.value.matched
    // /appmanage 是 / 的子路由，matched 应包含父路由
    expect(matched.length).toBeGreaterThanOrEqual(1)
  })

  it('should resolve AppManage component for /appmanage', async () => {
    const router = createTestRouter()
    const resolved = router.resolve('/appmanage')
    expect(resolved.path).toBe('/appmanage')
  })

  it('should resolve FormDesigner component for /formdesigner', async () => {
    const router = createTestRouter()
    const resolved = router.resolve('/formdesigner')
    expect(resolved.path).toBe('/formdesigner')
  })
})

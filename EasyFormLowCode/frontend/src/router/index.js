import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: () => import('../views/Main.vue'),
      redirect: '/pagedesigner',
      children: [
        {
          path: 'workbench',
          name: 'WorkBench',
          meta: { title: '工作台' },
          component: () => import('../views/WorkBench.vue'),
        },
        {
          path: 'appmanage',
          name: 'AppManage',
          meta: { title: '项目管理' },
          component: () => import('../views/AppManage.vue'),
        },
        {
          path: 'entities',
          name: 'EntityManage',
          meta: { title: '数据模型' },
          component: () => import('../views/EntityManage.vue'),
        },
        {
          path: 'pagedesigner',
          name: 'PageDesigner',
          meta: { title: '页面设计' },
          component: () => import('../views/PageDesigner.vue'),
        },
        {
          path: 'preview',
          name: 'Preview',
          meta: { title: '运行预览' },
          component: () => import('../views/Preview.vue'),
        },
        {
          path: 'setting',
          name: 'Setting',
          meta: { title: '系统设置' },
          component: () => import('../views/Setting.vue'),
        },
        {
          path: ':pathMatch(.*)*',
          name: 'NotFound',
          meta: { title: '页面不存在' },
          component: () => import('../views/NotFound.vue'),
        },
      ],
    },
  ],
})

export default router
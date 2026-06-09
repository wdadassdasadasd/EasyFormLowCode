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
          name: '工作台',
          component: () => import('../views/WorkBench.vue'),
        },
        {
          path: 'appmanage',
          name: '项目管理',
          component: () => import('../views/AppManage.vue'),
        },
        {
          path: 'pagedesigner',
          name: '页面设计',
          component: () => import('../views/PageDesigner.vue'),
        },
        {
          path: 'preview',
          name: '运行预览',
          component: () => import('../views/Preview.vue'),
        },
        {
          path: 'setting',
          name: '系统设置',
          component: () => import('../views/Setting.vue'),
        },
      ],
    },
  ],
})

export default router

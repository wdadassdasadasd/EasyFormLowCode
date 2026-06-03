import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: () => import('../views/Main.vue'),
      redirect: '/appmanage',
      children: [
        {
          path: 'appmanage',
          component: () => import('../views/AppManage.vue')
        },
        {
          path: 'formdesigner',
          component: () => import('../views/FormDesigner.vue')
        }
  ]
}
    
  ],
})

export default router

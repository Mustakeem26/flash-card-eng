import { createRouter, createWebHistory } from 'vue-router'

import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/home',
      name: 'home',
      component: () => import('../views/HomeView.vue'),
      meta: { requiresAuth: true, showNavbar: true }
    },
    {
      path: '/flashcard/:id',
      name: 'flashcard',
      component: () => import('../views/FlashcardView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/',
      name: 'login',
      component: () => import('../views/LoginView.vue')
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('../views/NotFoundView.vue')
    }
  ],
})

router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()
  
  // Wait for auth to initialize if it hasn't
  if (!authStore.initialized) {
    await authStore.initialize()
  }

  if (to.meta.requiresAuth && !authStore.user) {
    next('/')
  } else if (to.path === '/' && authStore.user) {
    next('/home') 
  } else {
    next()
  }
})

export default router

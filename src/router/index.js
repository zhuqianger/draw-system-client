import { createRouter, createWebHistory } from 'vue-router'
import Login from '../views/Login.vue'
import SessionList from '../views/SessionList.vue'
import AuctionRoom from '../views/AuctionRoom.vue'

const routes = [
  {
    path: '/',
    redirect: '/login'
  },
  {
    path: '/login',
    name: 'Login',
    component: Login
  },
  {
    path: '/sessions',
    name: 'SessionList',
    component: SessionList,
    meta: { requiresAuth: true }
  },
  {
    path: '/auction/:sessionId',
    name: 'AuctionRoom',
    component: AuctionRoom,
    meta: { requiresAuth: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token')
  if (to.meta.requiresAuth && !token) {
    next('/login')
  } else {
    next()
  }
})

export default router

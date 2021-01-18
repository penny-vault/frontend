import Vue from 'vue'
import VueRouter from 'vue-router'
import Home from '../views/Home.vue'
import Profile from '../views/Profile.vue'
import StrategyCards from '../views/StrategyCards.vue'
import Strategy from '../views/Strategy.vue'
import ManagementApi from '../views/ManagementApi.vue'

import { authGuard } from '../auth/authGuard'

Vue.use(VueRouter)

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home
  },
  {
    path: '/profile',
    name: 'profile',
    component: Profile,
    beforeEnter: authGuard
  },
  {
    path: '/strategies',
    name: 'strategies',
    component: StrategyCards,
    beforeEnter: authGuard
  },
  {
    path: '/strategy/:id',
    name: 'strategy',
    component: Strategy,
    beforeEnter: authGuard
  },
  {
    path: "/management-api",
    name: "management-api",
    component: ManagementApi,
    beforeEnter: authGuard
  },
  {
    path: '/about',
    name: 'About',
    // route level code-splitting
    // this generates a separate chunk (about.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import(/* webpackChunkName: "about" */ '../views/About.vue')
  }
]

const router = new VueRouter({
  mode: 'history',
  base: process.env.BASE_URL,
  routes
})

export default router

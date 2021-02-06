import Vue from 'vue'
import VueRouter from 'vue-router'
import Home from '../views/Home.vue'
import TermsOfService from '../views/TermsOfService.vue'
import PrivacyPolicy from '../views/PrivacyPolicy.vue'
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
    path: '/tos',
    name: 'TermsOfService',
    component: TermsOfService
  },
  {
    path: '/privacy-policy',
    name: 'PrivacyPolicy',
    component: PrivacyPolicy
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
  }
]

const router = new VueRouter({
  mode: 'history',
  base: process.env.BASE_URL,
  routes
})

export default router

import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { requireAuth } from './auth/guard'
import MainLayout from './layouts/MainLayout.vue'
import SplashLayout from './layouts/SplashLayout.vue'
import PortfolioLayout from './layouts/PortfolioLayout.vue'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: SplashLayout,
    children: [
      {
        path: '',
        name: 'splash',
        component: () => import('./pages/SplashPage.vue')
      }
    ]
  },
  {
    path: '/',
    component: MainLayout,
    beforeEnter: requireAuth,
    children: [
      {
        path: 'portfolios',
        name: 'portfolio-list',
        component: () => import('./pages/PortfolioList.vue')
      },
      {
        path: 'strategies',
        name: 'strategy-list',
        component: () => import('./pages/StrategyList.vue')
      },
      {
        path: 'portfolios/new',
        name: 'portfolio-create',
        component: () => import('./pages/PortfolioCreate.vue')
      },
      {
        path: 'portfolios/:id',
        component: PortfolioLayout,
        children: [
          {
            path: '',
            name: 'portfolio-summary',
            component: () => import('./pages/PortfolioSummary.vue')
          },
          {
            path: 'returns',
            name: 'portfolio-returns',
            component: () => import('./pages/PortfolioReturns.vue')
          },
          {
            path: 'vs-benchmark',
            name: 'portfolio-vs-benchmark',
            component: () => import('./pages/PortfolioVsBenchmark.vue')
          },
          {
            path: 'risk',
            name: 'portfolio-risk',
            component: () => import('./pages/PortfolioRisk.vue')
          },
          {
            path: 'factors',
            name: 'portfolio-factors',
            component: () => import('./pages/PortfolioFactors.vue')
          },
          {
            path: 'holdings',
            name: 'portfolio-holdings',
            component: () => import('./pages/PortfolioHoldings.vue')
          },
          {
            path: 'transactions',
            name: 'portfolio-transactions',
            component: () => import('./pages/PortfolioTransactions.vue')
          },
          {
            path: 'settings',
            name: 'portfolio-settings',
            component: () => import('./pages/PortfolioSettings.vue')
          }
        ]
      }
    ]
  },
  { path: '/:pathMatch(.*)*', redirect: '/' }
]

export default createRouter({
  history: createWebHistory(),
  routes
})

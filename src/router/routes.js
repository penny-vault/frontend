import { routeGuard } from '../auth'

const routes = [
  {
    path: '/',
    component: () => import('layouts/FrontLayout.vue'),
    children: [
      {
        path: '',
        component: () => import('pages/Splash.vue')
      }
    ]
  },
  {
    path: '/app',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      {
        path: '',
        component: () => import('pages/Index.vue'),
        beforeEnter: routeGuard
      },
      {
        path: 'portfolios',
        component: () => import('pages/PortfolioList.vue'),
        beforeEnter: routeGuard
      },
      {
        path: 'portfolios/:id',
        component: () => import('pages/PortfolioSummary.vue'),
        props: route => ({ portfolioId: route.params.id }),
        beforeEnter: routeGuard
      }
    ]
  },

  {
    path: '/legal',
    component: () => import('layouts/FrontLayout.vue'),
    children: [
      {
        path: 'tos',
        component: () => import('pages/TermsOfService.vue'),
      }
    ]
  },

  // Always leave this as last one,
  // but you can also remove it
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/Error404.vue')
  }
]

export default routes

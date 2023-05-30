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
        path: 'api',
        component: () => import('pages/ApiKey.vue'),
        beforeEnter: routeGuard
      },
      {
        path: 'portfolio',
        component: () => import('pages/PortfolioList.vue'),
        beforeEnter: routeGuard
      },
      {
        path: 'portfolio/:id',
        component: () => import('src/pages/Portfolio.vue'),
        props: route => ({ portfolioId: route.params.id }),
        beforeEnter: routeGuard
      },
      {
        path: 'strategies',
        component: () => import('src/pages/StrategyList.vue'),
        beforeEnter: routeGuard
      },
      {
        path: 'strategy/:shortcode',
        component: () => import('src/pages/Strategy.vue'),
        props: route => ({ strategyShortCode: route.params.shortcode }),
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
        component: () => import('pages/TermsOfService.vue')
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

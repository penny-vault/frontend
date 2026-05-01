import { createApp } from 'vue'
import { createPinia } from 'pinia'
import PrimeVue from 'primevue/config'
import Aura from '@primevue/themes/aura'
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'

import App from './App.vue'
import router from './router'
import { buildAuth0, wireAuthTokenProvider } from './auth/plugin'

import './styles/base.css'
import './styles/revogrid-theme.css'
import 'primeicons/primeicons.css'
import './util/echarts-setup'

async function enableMocking(): Promise<void> {
  if (import.meta.env.VITE_USE_MOCKS !== '1') return
  const { worker } = await import('./mocks/browser')
  await worker.start({ onUnhandledRequest: 'bypass' })
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
      retry: 1
    }
  }
})

enableMocking().then(() => {
  const app = createApp(App)
  app.use(createPinia())
  app.use(router)
  app.use(VueQueryPlugin, { queryClient })

  const auth = buildAuth0()
  app.use(auth)
  wireAuthTokenProvider(auth)

  app.use(PrimeVue, {
    theme: { preset: Aura, options: { darkModeSelector: '.pv-dark' } }
  })
  app.mount('#app')
})

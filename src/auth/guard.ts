import type { NavigationGuardWithThis } from 'vue-router'
import { authGuard } from '@auth0/auth0-vue'

export const requireAuth: NavigationGuardWithThis<unknown> = (to) => {
  if (import.meta.env.VITE_USE_MOCKS === '1') return true
  return authGuard(to)
}

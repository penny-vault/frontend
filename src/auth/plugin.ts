import { createAuth0, type Auth0VueClientOptions } from '@auth0/auth0-vue'
import { registerAuthTokenProvider, registerUnauthHandler } from '@/api/client'

export function buildAuth0() {
  const options: Auth0VueClientOptions = {
    domain: import.meta.env.VITE_AUTH0_DOMAIN,
    clientId: import.meta.env.VITE_AUTH0_CLIENT_ID,
    authorizationParams: {
      redirect_uri: window.location.origin,
      audience: import.meta.env.VITE_AUTH0_AUDIENCE
    },
    cacheLocation: 'localstorage',
    useRefreshTokens: true
  }
  const plugin = createAuth0(options)
  return plugin
}

const REDIRECT_TO_LOGIN_ERRORS = new Set([
  'login_required',
  'consent_required',
  'interaction_required'
])

export function wireAuthTokenProvider(auth: ReturnType<typeof createAuth0>): void {
  // In mock mode, skip Auth0 token acquisition entirely — MSW handles auth-free
  if (import.meta.env.VITE_USE_MOCKS === '1') {
    registerAuthTokenProvider(async () => null)
    return
  }
  registerAuthTokenProvider(async () => {
    try {
      const token = await auth.getAccessTokenSilently()
      return token ?? null
    } catch (err: unknown) {
      const code = (err as { error?: string })?.error
      if (code && REDIRECT_TO_LOGIN_ERRORS.has(code)) {
        await auth.loginWithRedirect()
      }
      return null
    }
  })
  registerUnauthHandler(() => auth.loginWithRedirect())
}

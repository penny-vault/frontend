import createAuth0Client from '@auth0/auth0-spa-js'
import console from 'console'
import { window } from 'globalthis/implementation'
import { computed, reactive, watchEffect } from 'vue'

let client
const state = reactive({
  loading: true,
  isAuthenticated: false,
  user: {},
  error: null,
})

async function handleRedirectCallback() {
  state.loading = true

  try {
    await client.handleRedirectCallback()
    state.user = await client.getUser()
    state.isAuthenticated = true
  } catch (e) {
    state.error = e
  } finally {
    state.loading = false
  }
}

function loginWithRedirect(o) {
  return client.loginWithRedirect(o)
}

function getIdTokenClaims(o) {
  return client.getIdTokenClaims(o)
}

function getTokenSilently(o) {
  return client.getTokenSilently(o)
}

function logout(o) {
  return client.logout(o)
}

export const authPlugin = {
  isAuthenticated: computed(() => state.isAuthenticated),
  loading: computed(() => state.loading),
  user: computed(() => state.user),
  getIdTokenClaims,
  getTokenSilently,
  handleRedirectCallback,
  loginWithRedirect,
  logout,
}

export const routeGuard = (to, from, next) => {
  const { isAuthenticated, loading, loginWithRedirect } = authPlugin

  const verify = () => {
    // If the user is authenticated, continue with the route
    if (isAuthenticated.value) {
      return next()
    }

    // Otherwise, log in
    loginWithRedirect({ appState: { targetUrl: to.fullPath } })
  }

  // If loading has already finished, check our auth state using `fn()`
  if (!loading.value) {
    return verify()
  }

  // Watch for the loading property to change before we check isAuthenticated
  watchEffect(() => {
    if (loading.value === false) {
      return verify()
    }
  })
}

export const setupAuth = async (options, store, callbackRedirect) => {
  client = await createAuth0Client({
    ...options,
    client_id: options.clientId,
    redirect_uri: window.location.origin + '/#/app'
  })

  try {
    // If the user is returning to the app after authentication
    if (
      window.location.search.includes('code=') &&
      window.location.search.includes('state=')
    ) {
      // handle the redirect and retrieve tokens
      const { appState } = await client.handleRedirectCallback()

      // Notify subscribers that the redirect callback has happened, passing the appState
      // (useful for retrieving any pre-authentication state)
      callbackRedirect(appState)
    }
  } catch (e) {
    console.error(`setupAuth - error ${e}`)
    state.error = e
  } finally {
    // Initialize our internal authentication state
    state.isAuthenticated = await client.isAuthenticated()
    store.commit('user/setAuthenticated', state.isAuthenticated)
    state.user = await client.getUser()
    // TODO - Include this in the auth0 profile
    if (state.user !== undefined) {
      state.user.plan = "Platinum Pro"
      store.commit('user/setProfile', state.user)
    }
    state.loading = false
  }

  return {
    install: (app) => {
      app.config.globalProperties.$auth = authPlugin
    },
  }
}
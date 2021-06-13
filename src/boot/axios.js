import { boot } from 'quasar/wrappers'
import axios from 'axios'

import localforage from 'localforage'
import { setupCache } from 'axios-cache-adapter'

const forageStore = localforage.createInstance({
  // List of drivers used
  driver: [
    localforage.INDEXEDDB,
    localforage.LOCALSTORAGE
  ],
  // Prefix all storage keys to prevent conflicts
  name: 'pv-cache'
})

// Create `axios-cache-adapter` instance
const cache = setupCache({
  maxAge: 15 * 60 * 1000,
  store: forageStore,
  debug: false,
  invalidate: async (config, request) => {
    if (request.clearCacheEntry) {
      await config.store.removeItem(config.uuid)
    }
  },
  exclude: {
    query: false,
    // Only exclude PUT, PATCH and DELETE methods from cache
    methods: ['put', 'patch', 'delete']
  }
})

// Be careful when using SSR for cross-request state pollution
// due to creating a Singleton instance here;
// If any client changes this (global) instance, it might be a
// good idea to move this instance creation inside of the
// "export default () => {}" function below (which runs individually
// for each client)
const api = axios.create({
  adapter: cache.adapter,
  baseURL: 'https://penny-vault.herokuapp.com/v1',
})

export default boot(({ app }) => {
  // for use inside Vue files (Options API) through this.$axios and this.$api

  app.config.globalProperties.$axios = axios
  // ^ ^ ^ this will allow you to use this.$axios (for Vue Options API form)
  //       so you won't necessarily have to import axios in each vue file

  app.config.globalProperties.$api = api
  // ^ ^ ^ this will allow you to use this.$api (for Vue Options API form)
  //       so you can easily perform requests against your app's API
})

export { api }

import { store } from 'quasar/wrappers'
import { createStore } from 'vuex'

import app from './app'
import portfolio from './portfolio'
import strategy from './strategy'
import user from './user'

export default store(function (/* { ssrContext } */) {
  const Store = createStore({
    modules: {
      app,
      portfolio,
      strategy,
      user
    },

    // enable strict mode (adds overhead!)
    // for dev mode and --debug builds only
    strict: process.env.DEBUGGING
  })

  return Store
})

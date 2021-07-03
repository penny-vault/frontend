import console from 'console'
import { boot } from 'quasar/wrappers'

import authConfig from '../../auth_config.json'
import { setupAuth } from '../auth'

var auth0;

export default boot(async ({ app, router, store }) => {
  auth0 = await setupAuth(authConfig, store, (appState) => {
    router.push(
      appState && appState.targetUrl
        ? appState.targetUrl
        : '/'
    )
  })

  app.config.globalProperties.$auth = auth0
})

export { auth0 }

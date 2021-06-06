import console from 'console'
import { boot } from 'quasar/wrappers'

import authConfig from '../../auth_config.json'
import { setupAuth } from '../auth'

// "async" is optional;
// more info on params: https://v2.quasar.dev/quasar-cli/boot-files
export default boot(async ({ app, router, store }) => {
  let auth = await setupAuth(authConfig, store, (appState) => {
    router.push(
      appState && appState.targetUrl
        ? appState.targetUrl
        : '/'
    )
  })
  app.config.globalProperties.$auth = auth
  app.use(auth)
})

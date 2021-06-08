import { boot } from 'quasar/wrappers'
import VueHighcharts from 'vue3-highcharts'

// "async" is optional;
// more info on params: https://v2.quasar.dev/quasar-cli/boot-files
export default boot(async ({ app }) => {
  app.use(VueHighcharts)
})

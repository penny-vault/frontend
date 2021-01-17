import Vue from 'vue'
import { BootstrapVue, IconsPlugin } from 'bootstrap-vue'
import App from './App.vue'

// Import Bootstrap an BootstrapVue CSS files (order is important)
import "./assets/theme.scss";

Vue.config.productionTip = false

// Make BootstrapVue available throughout project
Vue.use(BootstrapVue)
Vue.use(IconsPlugin)

new Vue({
  render: h => h(App),
}).$mount('#app')

import Vue from 'vue'
import { BootstrapVue, IconsPlugin } from 'bootstrap-vue'
import App from './App.vue'
import router from './router'
import axios from "axios";
import Vuex from 'vuex'

// Highcharts
import HighchartsVue from 'highcharts-vue'

// Import the Auth0 configuration
import { domain, clientId, audience } from "../auth_config.json";
import { Auth0Plugin } from "./auth";

// Import Bootstrap an BootstrapVue CSS files (order is important)
import "./assets/theme.scss";

// Install auth0 authentication
Vue.use(Auth0Plugin, {
  domain,
  clientId,
  audience,
  onRedirectCallback: appState => {
    router.push(
      appState && appState.targetUrl
        ? appState.targetUrl
        : window.location.pathname
    );
  }
});

// Make BootstrapVue available throughout project
Vue.use(BootstrapVue)
Vue.use(IconsPlugin)
Vue.use(HighchartsVue)

Vue.config.productionTip = false

// setup axios
const axiosConfig = {
  baseURL: 'https://penny-vault.herokuapp.com/v1',
//  baseURL: 'http://localhost:3000/v1',
  timeout: 30000,
};

Vue.prototype.$axios = axios.create(axiosConfig)

// setup Vuex
Vue.use(Vuex)
const store = new Vuex.Store({
  state: {
    appVersion: require('../package.json').version,
    changelog: "https://github.com/jdfergason/pv-frontend/blob/master/CHANGELOG.md"
  }
})

new Vue({
  router,
  store: store,
  render: h => h(App)
}).$mount('#app')

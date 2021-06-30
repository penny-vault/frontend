<template>
  <q-layout view="hHh lpR lFf">

    <q-header elevated class="bg-dark text-white">
      <q-toolbar>
        <q-btn dense flat round icon="menu" class="q-mr-sm" @click="toggleLeftDrawer" />
        <q-separator dark vertical inset />
        <q-toolbar-title class="text-fancy">
          <q-avatar class="q-mr-sm">
            <img src="~assets/logo.webp">
          </q-avatar>
          Penny Vault
        </q-toolbar-title>

      <trading-view-ticker :show-symbol-logo="false" color-theme="dark" style="width: calc(100% - 500px)" class="q-mr-md q-mt-sm gt-sm" />

      <portfolio-dropdown />

      <q-separator dark vertical inset />

      <q-btn-dropdown v-if="authenticated" stretch flat :label="user.name">
      <div class="row no-wrap q-pa-md">
        <div class="gt-xs column">
           <q-list>

            <q-item-label header>Profile</q-item-label>
              <q-item>
                <q-item-section avatar>
                  <q-icon color="primary" name="ion-mail" />
                </q-item-section>
                <q-item-section>{{ user.email }}</q-item-section>
              </q-item>

              <q-item>
                <q-item-section avatar>
                  <q-icon color="primary" name="ion-speedometer" />
                </q-item-section>
                <q-item-section>{{ user.plan }}</q-item-section>
              </q-item>

              <q-item>
                <q-item-section avatar>
                  <q-icon color="primary" name="ion-checkmark-circle-outline" />
                </q-item-section>
                <q-item-section>{{ user.email_verified ? "Email verified" : "Email not verified" }}</q-item-section>
              </q-item>
          </q-list>
        </div>

        <q-separator vertical inset class="gt-xs q-mx-lg" />

        <div class="column items-center">
          <q-avatar size="72px">
            <img :src="user.picture">
          </q-avatar>

          <div class="text-subtitle1 q-mt-md q-mb-xs">{{ user.name }}</div>

          <q-btn
            color="primary"
            label="Logout"
            push
            size="sm"
            @click="logout()"
          />
        </div>
      </div>
      </q-btn-dropdown>
      <q-btn v-else label="Login" @click="login()" />

      </q-toolbar>
    </q-header>

    <q-drawer show-if-above v-model="leftDrawerOpen" class="sidebar" :width="170" :mini="miniDrawer" side="left" bordered>
      <!-- sidebar content begin -->
      <q-list>
        <EssentialLink
          v-for="link in essentialLinks"
          :key="link.title"
          v-bind="link"
        />
      </q-list>

        <q-btn round flat @click="toggleMiniDrawer" icon="double_arrow" color="grey-4" :class="rotateDrawer" size="sm"></q-btn>
      <!-- sidebar content end -->
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>

    <q-footer bordered class="bg-grey-1 text-black q-pa-sm">
      <copyright></copyright>
    </q-footer>

  </q-layout>
</template>

<script>
import EssentialLink from 'components/EssentialLink.vue'
import Copyright from 'components/Copyright.vue'
import PortfolioDropdown from 'components/PortfolioDropdown.vue'
import TradingViewTicker from 'components/TradingViewTicker.vue'

import { defineComponent, computed, ref } from 'vue'
import { useStore } from 'vuex'

import Menu from '../assets/menu'

export default defineComponent({
  name: 'MainLayout',

  components: {
    Copyright,
    EssentialLink,
    PortfolioDropdown,
    TradingViewTicker
  },

  setup () {
    const $store = useStore()
    const leftDrawerOpen = ref(false)
    const miniDrawer = ref(false)

    const authenticated = computed(() => $store.state.user.authenticated)
    const rotateDrawer = computed(() => miniDrawer.value ? 'sidebar-expand q-mb-xs fixed-bottom' : 'rotate-180 sidebar-expand q-mb-xs fixed-bottom')
    const user = computed(() => $store.state.user.profile)

    return {
      authenticated,
      miniDrawer,
      essentialLinks: Menu,
      leftDrawerOpen,
      rotateDrawer,
      toggleLeftDrawer () {
        leftDrawerOpen.value = !leftDrawerOpen.value
      },
      toggleMiniDrawer() {
        miniDrawer.value = !miniDrawer.value
      },
      login () {
        this.$auth.loginWithRedirect({ appState: { targetUrl: window.location.pathname + window.location.hash } })
      },
      logout () {
        this.$auth.logout()
      },
      user
    }
  }
})
</script>

<style lang="scss" scoped>
  .sidebar-expand {
    margin-left: 12px;
  }
</style>
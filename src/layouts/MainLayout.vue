<template>
  <q-layout view="hHh lpR lFf">

    <q-header bordered class="bg-dark text-white">
      <q-toolbar>
        <q-btn dense flat round icon="menu" @click="toggleLeftDrawer" />
<q-separator dark vertical inset />
        <q-toolbar-title class="title">
          <q-avatar class="q-mr-sm">
            <img src="~assets/logo.webp">
          </q-avatar>
          Penny Vault
        </q-toolbar-title>

      <q-btn-dropdown stretch flat :label="user.name">
      <div class="row no-wrap q-pa-md">
        <div class="column">
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

        <q-separator vertical inset class="q-mx-lg" />

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

      </q-toolbar>
    </q-header>

    <q-drawer show-if-above v-model="leftDrawerOpen" side="left" bordered>
      <!-- sidebar content begin -->
      <q-list>
        <q-item-label
          header
          class="text-grey-8"
        >
          Essential Links
        </q-item-label>

        <EssentialLink
          v-for="link in essentialLinks"
          :key="link.title"
          v-bind="link"
        />
      </q-list>
      <!-- sidebar content end -->
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>

    <q-footer bordered class="bg-grey-1 text-black q-pa-sm">
        Copyright 2021 (C)
    </q-footer>

  </q-layout>
</template>

<script lang="ts">
import EssentialLink from 'components/EssentialLink.vue'

const linksList = [
  {
    title: 'Docs',
    caption: 'quasar.dev',
    icon: 'school',
    link: 'https://quasar.dev'
  },
  {
    title: 'Github',
    caption: 'github.com/quasarframework',
    icon: 'code',
    link: 'https://github.com/quasarframework'
  },
  {
    title: 'Discord Chat Channel',
    caption: 'chat.quasar.dev',
    icon: 'chat',
    link: 'https://chat.quasar.dev'
  },
  {
    title: 'Forum',
    caption: 'forum.quasar.dev',
    icon: 'record_voice_over',
    link: 'https://forum.quasar.dev'
  },
  {
    title: 'Twitter',
    caption: '@quasarframework',
    icon: 'rss_feed',
    link: 'https://twitter.quasar.dev'
  },
  {
    title: 'Facebook',
    caption: '@QuasarFramework',
    icon: 'public',
    link: 'https://facebook.quasar.dev'
  },
  {
    title: 'Quasar Awesome',
    caption: 'Community Quasar projects',
    icon: 'favorite',
    link: 'https://awesome.quasar.dev'
  }
];

import { defineComponent, computed, ref } from 'vue'
import { useStore } from 'vuex'

export default defineComponent({
  name: 'MainLayout',

  components: {
    EssentialLink
  },

  setup () {
    const $store = useStore()
    const leftDrawerOpen = ref(false)

    const user = computed({
      get: () => $store.state.user.profile,
      set: val => {
        $store.commit('user/setProfile', val)
      }
    })

    return {
      essentialLinks: linksList,
      leftDrawerOpen,
      toggleLeftDrawer () {
        leftDrawerOpen.value = !leftDrawerOpen.value
      },
      logout () {
        this.$auth.logout()
      },
      user
    }
  }
})
</script>

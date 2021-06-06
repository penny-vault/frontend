<template>
  <q-layout view="hHh lpR fFf">

    <q-header bordered class="bg-dark text-white">
      <q-toolbar>
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

    <q-page-container>
      <router-view />
    </q-page-container>

    <q-footer bordered class="bg-grey-1 text-black q-pa-sm">
      <copyright></copyright>
    </q-footer>

  </q-layout>
</template>

<script lang="ts">

import { defineComponent, computed, ref } from 'vue'
import { useStore } from 'vuex'

import Copyright from 'components/Copyright.vue'

export default defineComponent({
  name: 'LegalLayout',

  components: {
    Copyright
  },

  setup () {
    const $store = useStore()

    const user = computed({
      get: () => $store.state.user.profile,
      set: val => {
        $store.commit('user/setProfile', val)
      }
    })

    return {
      logout () {
        this.$auth.logout()
      },
      user
    }
  }
})
</script>

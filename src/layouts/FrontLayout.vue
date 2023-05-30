<template>
  <q-layout view="hHh lpR fFf">

    <q-header bordered class="bg-dark text-white">
      <q-toolbar>
        <q-toolbar-title class="text-fancy">
          <q-avatar class="q-mr-sm">
            <img src="~assets/logo.webp">
          </q-avatar>
          Penny Vault
        </q-toolbar-title>

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

<script>

import { defineComponent } from 'vue'

import Copyright from 'components/Copyright.vue'

export default defineComponent({
  name: 'FrontLayout',

  components: {
    Copyright
  }
})
</script>

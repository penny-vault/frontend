<template>
<div class="row">
  <div class="col">
    Penny Vault v{{ appVersion }} <a :href="changelog" target="_blank">Changelog</a>.
  </div>

  <div class="col text-right">
    Copyright &copy; 2021. All rights reserved. <router-link to="/legal/tos">Terms of Service</router-link>.
  </div>
</div>
</template>

<script>
import { defineComponent, computed } from 'vue'
import { useStore } from 'vuex'

export default defineComponent({
  name: 'Copyright',

  setup () {
    const $store = useStore()

    const appVersion = computed({
      get: () => $store.state.app.version
    })

    const changelog = computed({
      get: () => $store.state.app.changelog
    })

    return {
      appVersion,
      changelog
    }
  }
})

</script>

<style lang="scss" scoped>
a {
    text-decoration: none;
    color: $secondary;
}

a:hover {
    color: $accent;
}
</style>
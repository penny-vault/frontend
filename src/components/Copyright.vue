<template>
<div class="row">
  <div class="col gt-xs">
    Penny Vault v{{ appVersion }} <a :href="changelog" target="_blank">Changelog</a>.
  </div>
  <div class="col-2 xs">
    v{{ appVersion }}
  </div>

  <div class="col gt-xs text-right">
    Copyright &copy; 2021. All rights reserved. <router-link to="/legal/tos">Terms of Service</router-link>.
  </div>
  <div class="col-10 xs text-right">
    &copy; 2021 All rights reserved. <router-link to="/legal/tos">Terms of Service</router-link>
  </div>
</div>
</template>

<script>
import { defineComponent, computed } from 'vue'
import { useStore } from 'vuex'

export default defineComponent({
  // eslint-disable-next-line vue/multi-word-component-names
  name: 'Copyright',

  setup () {
    const $store = useStore()

    const appVersion = computed(() => $store.state.app.version)

    const changelog = computed(() => $store.state.app.changelog)

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

<template>
  <router-view />
</template>
<script>
import { defineComponent } from 'vue'
import { useQuasar } from 'quasar'

export default defineComponent({
  name: 'App',
  setup () {
    const $q = useQuasar()
    $q.iconMapFn = (iconName) => {
      if (iconName.startsWith('app:') === true) {
        const name = iconName.substring(4)
        return {
          cls: 'pvico ' + name
        }
      }
    }
  }
})
</script>
